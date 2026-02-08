import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface RouteParams {
  params: {
    filename: string;
  };
}

// GET /api/docs/[filename] - Serve markdown documentation files
export async function GET(
  req: NextRequest,
  ...args: unknown[]
) {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  
  try {
    const { filename } = params;
    
    // Security: Only allow .md files and prevent directory traversal
    if (!filename.endsWith('.md') || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Read markdown file from docs directory
    const filePath = join(process.cwd(), 'docs', filename);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Documentation file not found' },
        { status: 404 }
      );
    }
    
    console.error('Error reading documentation file:', error);
    return NextResponse.json(
      { error: 'Failed to read documentation file' },
      { status: 500 }
    );
  }
}

