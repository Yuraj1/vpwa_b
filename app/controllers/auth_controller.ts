import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async login({ request, response }: HttpContext) {
    const { email, password, username } = request.only(['email', 'password', 'username'])

    const user = await User.query().where('email', email).andWhere('username', username).first()

    if (!user) {
      return response.unauthorized({ message: 'Invalid email or username' })
    }

    const isPasswordValid = await hash.verify(user.password, password)

    if (!isPasswordValid) {
      return response.unauthorized({ message: 'Invalid password' })
    }

    const token = await User.accessTokens.create(user)

    return response.ok({ user: { id: user.id, email: user.email }, token })
  }

  async register({ request, response }: HttpContext) {
    const { name, surname, email, password, username } = request.only([
      'name',
      'surname',
      'email',
      'password',
      'username',
    ])

    const exists = await User.query().where('email', email).orWhere('username', username).first()

    if (exists) {
      return response.conflict({ message: 'User with this email or username already exists' })
    }

    const user = await User.create({
      name,
      surname,
      email,
      password,
      username,
    })

    const token = await User.accessTokens.create(user)

    return response.created({ user: { id: user.id, email: user.email }, token })
  }
}
