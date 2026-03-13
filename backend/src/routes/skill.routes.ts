import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { getSkills, createSkill, getSkill, updateSkill, deleteSkill, getMatches } from '../controllers/skill.controller';

const router = Router();

router.get('/', optionalAuth, getSkills);
router.get('/matches', authenticate, getMatches);
router.get('/:id', optionalAuth, getSkill);
router.post('/', authenticate, createSkill);
router.put('/:id', authenticate, updateSkill);
router.delete('/:id', authenticate, deleteSkill);

export default router;
