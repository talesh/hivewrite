import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProjectConfig, getActiveLanguages } from '@/lib/config';
import {
  withErrorHandling,
  createSuccessResponse,
  forbidden,
  notFound,
  logger,
} from '@/lib/api-utils';
import { requireProjectAdmin } from '@/lib/validation';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { project: string } }
) => {
  // Authenticate user
  const user = await requireAuth();

  // Check admin authorization
  try {
    requireProjectAdmin(user.username, params.project);
  } catch (error) {
    logger.warn('Unauthorized admin dashboard access attempt', {
      user: user.username,
      project: params.project,
    });
    return forbidden('Admin access required');
  }

  // Get project configuration
  let project;
  try {
    project = getProjectConfig(params.project);
  } catch (error) {
    return notFound(`Project "${params.project}" not found`);
  }

  const activeLanguages = getActiveLanguages(project);

  logger.info('Admin dashboard loaded', {
    user: user.username,
    project: params.project,
    languagesCount: activeLanguages.length,
  });

  return createSuccessResponse({
    project,
    activeLanguages,
  });
});
