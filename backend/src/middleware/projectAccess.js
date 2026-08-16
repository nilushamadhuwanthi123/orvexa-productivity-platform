import Project from '../models/Project.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Loads req.params[param] into req.project and asserts the caller may see it.
 * Admins can access every project; everyone else must be owner or member.
 */
export const loadProject = (param = 'projectId') =>
  asyncHandler(async (req, _res, next) => {
    const project = await Project.findById(req.params[param]);
    if (!project) throw ApiError.notFound('Project not found');

    if (req.user.role !== 'admin' && !project.hasMember(req.user._id)) {
      throw ApiError.forbidden('You are not a member of this project');
    }

    req.project = project;
    next();
  });

/** Asserts the caller can modify project settings (admin, global manager, or project owner). */
export const requireProjectManager = (req, _res, next) => {
  const p = req.project;
  const isOwner = String(p.owner) === String(req.user._id);
  const isProjectManager = p.members.some(
    (m) => String(m.user) === String(req.user._id) && m.projectRole !== 'contributor'
  );
  if (req.user.role === 'admin' || isOwner || isProjectManager) return next();
  return next(ApiError.forbidden('Only project owners and managers can perform this action'));
};
