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
}
