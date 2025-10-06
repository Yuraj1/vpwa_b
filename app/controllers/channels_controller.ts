import Channel from '#models/channel'
import Chat from '#models/chat'
import Message from '#models/message'
import User from '#models/user'
import { io } from '#start/socket'
import type { HttpContext } from '@adonisjs/core/http'

function parsePgIntArray(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number)
  if (typeof raw === 'string') {
    const s = raw.replace(/[{}]/g, '').trim()
    return s ? s.split(',').map((x) => Number(x.trim())) : []
  }
  return []
}

function toPgIntArrayString(arr: number[]): string {
  return `{${arr.join(',')}}`
}

export default class ChannelsController {
  async createChannel({ request, response, auth }: HttpContext) {
    const colors = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51']
    const user = await auth.use('api').authenticate()
    const user_id = user['$attributes'].id

    const { name, description, is_private } = request.only(['name', 'description', 'is_private'])

    const exists = await Channel.query().where('name', name).first()

    if (exists) {
      return response.conflict({ message: 'Channel with this name already exists' })
    }

    const channel = await Channel.create({
      name,
      description,
      isPrivate: is_private || false,
      ownerId: user_id,
      color: colors[Math.floor(Math.random() * colors.length)],
    })

    await channel.related('members').attach({
      [user_id]: {
        role: 'owner',
        reports: 0,
      },
    })
    await channel.load('owner', (q) => q.select(['id', 'username']))

    const chat = await Chat.create({
      title: 'general',
      ownerId: user_id,
    })

    await chat.related('channels').attach({
      [channel.id]: {},
    })

    const message = await Message.create({
      content: `chat ${chat.title} created by ${user.username}`,
      senderId: user.id,
      type: 'system',
    })

    await message.related('chats').attach([chat.id])

    return response.created({ channel })
  }

  async getAllChannels({}: HttpContext) {
    const channels = await Channel.query().preload('owner')
    return channels
  }

  async addUserToChannel({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const name = decodeURIComponent(params.name)
    const username = params.username

    const channel = await Channel.query().where('name', name).preload('owner').first()
    if (!channel) return response.notFound({ message: 'Channel not found' })

    const meInChannel = await channel.related('members').query().where('users.id', me.id).first()

    if (!meInChannel) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }
    if (channel.isPrivate && channel.ownerId !== me.id) {
      return response.forbidden({ message: 'Only the owner can add members to a private channel' })
    }

    const userToAdd = await User.query().where('username', username).first()
    if (!userToAdd) {
      return response.notFound({ message: 'User not found' })
    }
    const already = await channel
      .related('members')
      .query()
      .where('users.id', userToAdd.id)
      .pivotColumns(['banned'])
      .first()

    if (already) {
      const banned = !!(already as any).$extras?.pivot_banned
      if (banned) {
        const myRole = (meInChannel as any).$extras?.pivot_role
        if (myRole === 'owner') {
          await channel.related('members').pivotQuery().where('user_id', userToAdd.id).update({
            banned: false,
            kick_voters: '{}',
          })
          return response.ok({ message: `User ${username} unbanned and restored to channel` })
        }
        return response.forbidden({ message: 'User is banned in this channel' })
      }
      return response.conflict({ message: 'User is already in the channel' })
    }
    await channel.related('members').attach({
      [userToAdd.id]: { role: 'member', reports: 0 },
    })

    io.emit('channel:new', channel.serialize(), userToAdd.id)
    io.to(`channel:${channel.id}`).emit('channel:newuser', channel.serialize(), userToAdd)

    return response.created({
      member: {
        id: userToAdd.id,
        username: userToAdd.username,
        role: 'member',
        reports: 0,
      },
      channel: {
        id: channel.id,
        name: channel.name,
        isPrivate: channel.isPrivate,
      },
    })
  }

  async getChannelById({ params, response }: HttpContext) {
    const channel = await Channel.query().where('id', params.id).preload('owner').first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    return channel
  }

  async getAllUserChannels({ auth }: HttpContext) {
    const user = await auth.use('api').authenticate()

    const channels = await user
      .related('channels')
      .query()
      .select([
        'channels.color',
        'channels.id',
        'channels.name',
        'channels.is_private',
        'channels.owner_id',
        'channels.created_at',
      ])
      .pivotColumns(['role', 'reports', 'joined_at', 'banned', 'kick_voters'])
      .wherePivot('banned', false)
      .preload('owner', (ownerQuery) => {
        ownerQuery.select(['id', 'username', 'name', 'surname'])
      })

    return channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.isPrivate,
      ownerId: ch.ownerId,
      createdAt: ch.createdAt,
      color: ch.color,

      owner: ch.owner
        ? {
            id: ch.owner.id,
            username: ch.owner.username,
            name: ch.owner.name ?? null,
            surname: ch.owner.surname ?? null,
          }
        : null,

      role: ch.$extras.pivot_role,
      reports: ch.$extras.pivot_reports,
      joinedAt: ch.$extras.pivot_joined_at,
      banned: !!ch.$extras.pivot_banned,
      kick_voters: ch.$extras.pivot_kick_voters,
    }))
  }

  async getChatsByChannelId({ params }: HttpContext) {
    const channel = await Channel.query().where('id', params.id).preload('chats')
    return channel[0].$preloaded.chats
  }

  async leaveOrDeleteByName({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const id = decodeURIComponent(params.id)

    const channel = await Channel.query().where('id', id).preload('members').first()
    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    const meInChannel = await channel.related('members').query().where('users.id', me.id).first()
    if (!meInChannel) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }

    if (channel.ownerId === me.id) {
      await channel.related('members').detach()
      await channel.load('chats', (q) => q.preload('messages'))

      for (const chat of channel.chats) {
        for (const msg of chat.messages) {
          await msg.delete()
        }
        await chat.delete()
      }
      await channel.delete()
      return response.ok({ deleted: true, message: 'Channel deleted' })
    }

    await channel.related('members').detach([me.id])
    return response.ok({ left: true, message: 'Left the channel' })
  }

  public async getMembersById({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const channelId = Number(params.id)

    const channel = await Channel.query().where('id', channelId).first()
    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    const meIn = await channel.related('members').query().where('users.id', me.id).first()
    if (!meIn) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }

    const members = await channel
      .related('members')
      .query()
      .select([
        'users.id',
        'users.username',
        'users.name',
        'users.surname',
        'users.status',
        'users.color',
      ])
      .pivotColumns(['role', 'reports', 'banned'])
      .wherePivot('banned', false)

    return response.ok(members)
  }

  public async deleteChannelIfOwner({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const id = decodeURIComponent(params.id)

    const channel = await Channel.query().where('id', id).preload('members').first()
    if (!channel) return response.notFound({ message: 'Channel not found' })

    const meInChannel = await channel.related('members').query().where('users.id', me.id).first()
    if (!meInChannel) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }

    if (channel.ownerId !== me.id) {
      return response.forbidden({ message: 'Only the owner can delete this channel' })
    }

    await channel.related('members').detach()
    await channel.load('chats', (q) => q.preload('messages'))

    for (const chat of channel.chats) {
      for (const msg of chat.messages) {
        await msg.delete()
      }
      await chat.delete()
    }
    await channel.delete()
    return response.ok({ deleted: true, message: 'Channel deleted' })
  }

  public async revokeUserFromChannel({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const id = decodeURIComponent(params.id)
    const username = params.username

    const channel = await Channel.query().where('id', id).preload('members').first()
    if (!channel) return response.notFound({ message: 'Channel not found' })

    if (!channel.isPrivate) {
      return response.forbidden({ message: 'Revoke is allowed only in private channels' })
    }

    const meInChannel = await channel.related('members').query().where('users.id', me.id).first()
    if (!meInChannel) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }
    if (channel.ownerId !== meInChannel.id) {
      return response.forbidden({ message: 'Only the owner can revoke members' })
    }

    const target = await User.query().where('username', username).first()
    if (!target) return response.notFound({ message: 'User not found' })
    if (target.id === channel.ownerId) {
      return response.forbidden({ message: 'Cannot remove the channel owner' })
    }

    const targetIn = await channel.related('members').query().where('users.id', target.id).first()
    if (!targetIn) return response.conflict({ message: 'User is not in the channel' })

    await channel.related('members').detach([target.id])

    // io.emit('channel:member_removed', { channelId: channel.id, userId: target.id, by: me.id })

    return response.ok({
      revoked: true,
      message: `@${target.username} removed.`,
      member: { id: target.id, username: target.username },
      channel: { id: channel.id, name: channel.name, isPrivate: channel.isPrivate },
    })
  }

  public async joinChannel({ auth, params, request, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const id = Number(params.id)
    const makePrivate = !!request.input('private', false)

    let channel = await Channel.query().where('id', id).preload('members').first()
    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    if (channel.isPrivate) {
      return response.forbidden({ message: 'Cannot join a private channel, ask owner for invite' })
    }

    const already = await channel.related('members').query().where('users.id', me.id).first()
    if (already) {
      return response.ok({ message: 'Already a member', channel })
    }

    await channel.related('members').attach({
      [me.id]: { role: 'member', reports: 0 },
    })

    return response.ok({ joined: true, channel })
  }

  public async getChannelByName({ params, response }: HttpContext) {
    const name = decodeURIComponent(params.name || '').trim()
    if (!name) return response.badRequest({ message: 'Channel name is required' })

    const ch = await Channel.query()
      .where('name', name)
      .select(['id', 'name', 'is_private', 'owner_id'])
      .first()

    if (!ch) return response.notFound({ message: 'Channel not found' })

    return {
      id: ch.id,
      name: ch.name,
      isPrivate: ch.isPrivate,
      ownerId: ch.ownerId,
    }
  }

  public async kick({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const voterId = me.id

    const channelId = Number(params.id)
    const targetId = Number(params.userId)
    if (!channelId || !targetId) {
      return response.badRequest({ message: 'Channel id and user id are required' })
    }
    if (targetId === voterId) {
      return response.badRequest({ message: 'You cannot kick yourself' })
    }

    const channel = await Channel.query().where('id', channelId).first()
    if (!channel) return response.notFound({ message: 'Channel not found' })
    if (channel.isPrivate) return response.forbidden({ message: 'Only in public channel.' })

    const target = await User.query().where('id', targetId).first()
    if (!target) return response.notFound({ message: 'User not found' })

    const meInChannel = await channel
      .related('members')
      .query()
      .where('users.id', voterId)
      .pivotColumns(['role', 'banned'])
      .first()

    if (!meInChannel) return response.forbidden({ message: 'You are not a member of this channel' })

    const targetInChannel = await channel
      .related('members')
      .query()
      .where('users.id', targetId)
      .pivotColumns(['role', 'banned', 'kick_voters'])
      .first()

    if (!targetInChannel || targetInChannel.$extras.pivot_banned)
      return response.notFound({ message: 'User is not a member of this channel' })

    if (targetInChannel.$extras.pivot_role === 'owner')
      return response.forbidden({ message: 'Its owner you asshole' })

    const KICK_THRESHOLD = 3

    if (meInChannel.$extras.pivot_role === 'owner') {
      await channel
        .related('members')
        .pivotQuery()
        .where('user_id', targetId)
        .update({
          banned: true,
          kick_voters: toPgIntArrayString([]),
        })
      return response.ok({
        message: 'Banned permanently by owner',
        appliedBan: true,
        votes: KICK_THRESHOLD,
      })
    }

    let voters = parsePgIntArray(targetInChannel.$extras.pivot_kick_voters)
    if (voters.includes(voterId)) {
      return response.badRequest({ message: 'You already voted', votes: voters.length })
    }

    voters.push(voterId)
    const votes = voters.length
    const applyBan = voters.length >= KICK_THRESHOLD

    await channel
      .related('members')
      .pivotQuery()
      .where('user_id', targetId)
      .update({
        kick_voters: toPgIntArrayString(voters),
        banned: applyBan ? true : targetInChannel.$extras.pivot_banned,
      })

    return applyBan
      ? response.ok({ message: 'User permanently banned', appliedBan: true, votes })
      : response.ok({ message: 'Vote added', appliedBan: false, votes })
  }
}
