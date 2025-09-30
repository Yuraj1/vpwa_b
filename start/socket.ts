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
  })
})
