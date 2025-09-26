import UsersController from '#controllers/users_controller'
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import AuthController from '#controllers/auth_controller'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router
  .group(() => {
    router.get('/', [UsersController, 'getAllUsers'])
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
