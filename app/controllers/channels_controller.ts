import Channel from '#models/channel'
import User from '#models/user'
import { io } from '#start/socket'
import type { HttpContext } from '@adonisjs/core/http'

export default class ChannelsController {
  async createChannel({ request, response, auth }: HttpContext) {
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
    })
    await channel.related('members').attach({
      [user_id]: {
        role: 'owner',
        reports: 0,
      },
    })
    await channel.load('owner', (q) => q.select(['id', 'username']))
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

    const channel = await Channel.query().where('name', name).first()
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
    const already = await channel.related('members').query().where('users.id', userToAdd.id).first()

    if (already) {
      return response.conflict({ message: 'User is already in the channel' })
    }

    await channel.related('members').attach({
      [userToAdd.id]: { role: 'member', reports: 0 },
    })

    io.emit('channel:new', channel.serialize(), userToAdd.id)

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
        'channels.id',
        'channels.name',
        'channels.is_private',
        'channels.owner_id',
        'channels.created_at',
      ])
      .pivotColumns(['role', 'reports'])
      .preload('owner', (ownerQuery) => {
        ownerQuery.select(['id', 'username', 'name', 'surname'])
      })

  return channels.map((ch) => {
    const o = ch.owner
    const name =
      (o && (o as any).name) ?? (o && (o as any).$attributes?.name) ?? null
    const surname =
      (o && (o as any).surname) ?? (o && (o as any).$attributes?.surname) ?? null

    const displayName = [name, surname].join(' ') || o?.username || ''

    return {
      id: ch.id,
      name: ch.name,
      isPrivate: ch.isPrivate,
      ownerId: ch.ownerId,
      createdAt: ch.createdAt,
      owner: o
        ? {
            id: o.id,
            username: o.username,
            name,
            surname,
            displayName,
          }
        : null,
      role: ch.$extras.pivot_role,
      reports: ch.$extras.pivot_reports,
    }
  })
  }

  async getChatsByChannelId({ params }: HttpContext) {
    const channel = await Channel.query().where('id', params.id).preload('chats')
    return channel[0].$preloaded.chats
  }

  async leaveOrDeleteByName({ auth, params, response }: HttpContext) {
    const me = await auth.use('api').authenticate()
    const name = decodeURIComponent(params.name)

    const channel = await Channel.query().where('name', name).preload('members').first()
    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    const meInChannel = await channel.related('members').query().where('users.id', me.id).first()
    if (!meInChannel) {
      return response.forbidden({ message: 'You are not a member of this channel' })
    }

    if (channel.ownerId === me.id) {
      await channel.related('members').detach()

      await channel.delete()
      return response.ok({ deleted: true, message: 'Channel deleted' })
    }

    await channel.related('members').detach([me.id])
    return response.ok({ left: true, message: 'Left the channel' })
  }
}
