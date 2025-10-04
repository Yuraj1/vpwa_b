import Chat from '#models/chat'
import type { HttpContext } from '@adonisjs/core/http'
import { io } from '#start/socket'
import Message from '#models/message'

export default class ChatsController {
  async getAllChats({}: HttpContext) {
    const chats = await Chat.query().preload('channels')
    return chats
  }

  async getChatById({ params }: HttpContext) {
    const chat = await Chat.query().where('id', params.id).preload('channels').first()

    return chat
  }

  async createChat({ request, response, auth, params }: HttpContext) {
    const user = await auth.use('api').authenticate()
    // const user_id = user['$attributes'].id
    const { title } = request.only(['title'])
    const { id: channelId } = params

    // const exists = await Chat.query().where('title', title).first()
    // if (exists) {
    //   return response.conflict({ message: 'Chat with this title already exists' })
    // }

    const chat = await Chat.create({
      title,
      ownerId: user.id,
    })

    await chat.related('channels').attach({
      [params.id]: {},
    })

    io.to(`channel:${channelId}`).emit('chat:new', chat.serialize(), user.id)

    const message = await Message.create({
      content: `chat ${chat.title} created by ${user.username}`,
      senderId: user.id,
      type: 'system',
    })

    await message.related('chats').attach([chat.id])

    return response.created({ chat })
  }
}
