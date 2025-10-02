import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async getAllUsers({}: HttpContext) {
    const users = User.all()
    return users
  }
  public async me({ auth }: HttpContext) {
    return auth.user
  }
  async setStatus({ request, auth, response }: HttpContext) {
    const status = request.input('status')

    const allowed: Array<'online' | 'offline' | 'dnd'> = ['online', 'offline', 'dnd']
    if (!allowed.includes(status)) {
      return response.badRequest({ error: 'Invalid status value' })
    }

    const user = await auth.authenticate()
    user.status = status
    await user.save()

    return response.ok({ status: user.status })
  }
}
