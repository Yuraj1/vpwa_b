import Chat from '#models/chat'
import Message from '#models/message'
import { io } from '#start/socket'
import type { HttpContext } from '@adonisjs/core/http'

export default class MessagesController {
  async getTenMessages({ auth, params, response }: HttpContext) {
    const messages = await Message.query().orderBy('createdAt', 'desc').limit(10)
    return response.ok(messages)
  }

  async getAllChatMessages({ auth, params, response }: HttpContext) {
    const { chatId } = params

    const chat = await Chat.query()
      .where('id', chatId)
      .preload('messages', (messagesQuery) => {
        messagesQuery
          .preload('sender', (senderQuery) => {
            senderQuery.select(['username', 'status', 'name', 'surname', 'color'])
          })
          .orderBy('createdAt', 'asc')
      })
      .firstOrFail()

    return response.ok(chat.messages)
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
      senderQuery.select(['username', 'status', 'name', 'surname'])
    })

    io.emit('message:new', {
      chatId: chatIdNum,
      message: message.serialize(),
    })
    return response.created(message)
  }
}
