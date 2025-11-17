import { NextRequest, NextResponse } from 'next/server';
import { getAllProjectConfigs } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const projects = getAllProjectConfigs();

    return NextResponse.json({
      success: true,
      projects: projects.map((p) => ({
        slug: p.slug,
        name: p.name,
        githubRepo: p.githubRepo,
        languages: Object.keys(p.languages).length,
        activeLanguages: Object.values(p.languages).filter(
          (l) => l.status === 'active'
        ).length,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load projects',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
