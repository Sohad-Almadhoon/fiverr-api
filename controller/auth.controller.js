import User from '../models/user.model.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import createError from '../utils/createError.js'
const register = async (req, res, next) => {
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10)
    await User.create({
      ...req.body,
      password: hashedPassword,
    })
    res.status(201).send('User has been created!')
  } catch (error) {
    next(error)
  }
}
const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username })
    if (!user) return next(createError(404, 'User not found!'))
    const isCorrectPassword = bcrypt.compareSync(req.body.password, user.password)
    if (!isCorrectPassword) return next(createError(404, 'Wrong password or username!'))
    const token = jwt.sign(
      {
        id: user._id,
        isSeller: user.isSeller,
      },
      process.env.JWT_SEC
    )
    const { password, ...others } = user._doc
    res
      .cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
      .status(200)
      .json(others)
  } catch (error) {
    next(error)
  }
}
const logout = async (req, res) => {
  res
    .clearCookie('accessToken', {
      sameSite: 'none',
      secure: true,
    })
    .status(200)
    .send('User has been logged out.')
}

export { login, logout, register }
