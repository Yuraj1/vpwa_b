import UsersController from '#controllers/users_controller'
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import AuthController from '#controllers/auth_controller'
import ChannelsController from '#controllers/channels_controller'
import ChatsController from '#controllers/chats_controller'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router
  .group(() => {
    router.get('/', [UsersController, 'getAllUsers'])
    router.get('/me', [UsersController, 'me'])
    // router.get('/:id', [UsersController, 'getUserById'])
    // router.patch('/:id', [UsersController, 'updateUser'])
  })
  .prefix('api/users')
  .use(middleware.auth())
// .middleware(['auth']) // аналог passport.authenticate("jwt-user")

router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/login', [AuthController, 'login'])
  })
  .prefix('api/auth')

router
  .group(() => {
    router.post('/create', [ChannelsController, 'createChannel'])
    router.get('/all', [ChannelsController, 'getAllChannels'])
    router.get('/:id', [ChannelsController, 'getChannelById'])
    router.get('/all/user', [ChannelsController, 'getAllUserChannels'])
    router.get('/chats/:id', [ChannelsController, 'getChatsByChannelId'])
    // router.patch('/:id', [ChannelsController, 'updateChannel'])
    router.post('/:name/members/:username', [ChannelsController, 'addUserToChannel'])
    router.delete('/:name/leave', [ChannelsController, 'leaveOrDeleteByName'])
  })
  .prefix('api/channels')
  .use(middleware.auth())

router
  .group(() => {
    router.get('/all', [ChatsController, 'getAllChats'])
    router.get('/:id', [ChatsController, 'getChatById'])
    router.post('/create/:id', [ChatsController, 'createChat'])
  })
  .prefix('api/chats')
  .use(middleware.auth())

