// start/socket.ts
// import adonisServer from '@adonisjs/core/services/server'
// import { Server } from 'socket.io'

// export const io = new Server(adonisServer.getNodeServer(), {
//   cors: { origin: '*' },
// })

// io.use((socket, next) => {
//   const token = socket.handshake.auth?.token || socket.handshake.query?.token
//   if (!token) return next(new Error('No token'))
//   // TODO: проверь токен (JWT/Adonis tokensGuard) и положи user в socket.data
//   socket.data.userId = 123
//   next()
// })

// io.on('connection', (socket) => {
//   console.log('WS connected:', socket.id, 'user', socket.data.userId)

//   socket.on('chat:send', (payload) => {
//     io.to(`channel:${payload.channelId}`).emit('chat:new', payload)
//   })

//   socket.on('channel:join', (channelId: number) => {
//     socket.join(`channel:${channelId}`)
//   })

//   socket.on('disconnect', () => {
//     console.log('WS disconnected:', socket.id)
//   })
// })

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
      console.log(userId)
      socket.join(`user:${userId}`)
    })

    socket.on('org:subscribe', (orgId: number) => {
      socket.join(`org:${orgId}`)
    })

    socket.on('channel:new', (channel) => {
        console.log(channel)
    })
  })
})
