import Chat from '#models/chat'
import Message from '#models/message'
import { io } from '#start/socket'
import type { HttpContext } from '@adonisjs/core/http'

export default class MessagesController {
  async getTenMessages({ auth, params, response }: HttpContext) {
    const messages = await Message.query().orderBy('createdAt', 'desc').limit(10)
    return response.ok(messages)
  }

  async getAllChatMessages({ auth, params, response, request }: HttpContext) {
    const { chatId } = params
    const offset = Number(request.input('offset', 0))
    const limit = Number(request.input('limit', 10))

    console.log(offset, limit)

    const baseUrl = request.completeUrl()

    const chat = await Chat.query()
      .where('id', chatId)
      .preload('messages', (messagesQuery) => {
        messagesQuery
          .preload('sender', (senderQuery) => {
            senderQuery.select(['username', 'status', 'name', 'surname', 'color'])
          })
          .orderBy('createdAt', 'desc')
          .offset(offset)
          .limit(limit)
      })
      .firstOrFail()

    return response.ok({
      data: chat.messages,
      next: `${baseUrl}?offset=${offset + limit}&limit=${limit}`,
    })
  }

  async sendMessage({ auth, params, response, request }: HttpContext) {
    const { content, type } = request.only(['content', 'type'])
    const { chatId } = params
    const chatIdNum = Number(chatId)
    console.log(chatId)

    console.log('CONTENNNNTTT', content)

    const user = await auth.use('api').authenticate()

    const message = await Message.create({
      content,
      senderId: user.id,
      type: type,
    })

    await message.related('chats').attach([chatId])

    await message.load('sender', (senderQuery) => {
      senderQuery.select(['username', 'status', 'name', 'surname', 'color'])
    })

    io.emit('message:new', {
      chatId: chatIdNum,
      message: message.serialize(),
    })
    return response.created(message)
  }
}
