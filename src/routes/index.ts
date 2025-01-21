import { Router } from 'express'
import matchRoutes from './match'

const router = Router()

router.use('/matches', matchRoutes)

export default router
