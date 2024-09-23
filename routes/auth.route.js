import express from 'express'
import { login, logout, register } from '../controller/auth.controller.js'
import { verifyToken } from '../middleware/jwt.js'
const router = express.Router()

router.post('/register', register)
router.get('/verify', verifyToken, (req, res) => {
  res.status(200).send('Authenticated')
})
router.post('/login', login)
router.post('/logout', logout)
export default router
