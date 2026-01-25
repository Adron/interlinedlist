import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { detectLinks } from '@/lib/messages/link-detector';
import { fetchMultipleLinkMetadata } from '@/lib/messages/metadata-fetcher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/[id]/metadata
 * Fetches and updates metadata for a message's links
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id;
    
    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, content: true },
    });
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Detect links in message content
    const detectedLinks = detectLinks(message.content);
    
    if (detectedLinks.length === 0) {
      return NextResponse.json(
        { message: 'No links found in message' },
        { status: 200 }
      );
    }
    
    // Fetch metadata for all links
    const linkMetadataItems = await fetchMultipleLinkMetadata(detectedLinks);
    
    // Update message with metadata
    await prisma.message.update({
      where: { id: messageId },
      data: {
        linkMetadata: {
          links: linkMetadataItems,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    
    return NextResponse.json(
      {
        message: 'Metadata fetched successfully',
        metadata: {
          links: linkMetadataItems,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
