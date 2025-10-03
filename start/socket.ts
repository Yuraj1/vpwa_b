import app from '@adonisjs/core/services/app'
import { Server } from 'socket.io'
import server from '@adonisjs/core/services/server'

export let io: Server

app.ready(() => {
  io = new Server(server.getNodeServer(), {
    cors: {
      origin: '*',
    },
  })
  io?.on('connection', (socket) => {
    console.log('WS connected', socket.id)

    socket.on('auth:hello', (userId: number) => {
      console.log('User id', userId)
      socket.join(`user:${userId}`)
    })

    socket.on('channel:subscribe', (orgId: number) => {
      console.log(`channel:${orgId}`)
      socket.join(`channel:${orgId}`)
    })

    socket.on('channel:typing', ({ activeChannelId, userId, message }) => {
      io.to(`channel:${activeChannelId}`).emit('channel:typing', userId, message)
    })

    socket.on('channel:stopTyping', ({ activeChannelId, userId }) => {
      io.to(`channel:${activeChannelId}`).emit('channel:stopTyping', userId)
    })
  })
})
