import { NextResponse } from 'next/server'

interface YouTubeVideoResponse {
  items: Array<{
    snippet: {
      title: string
      thumbnails: {
        high: {
          url: string
        }
      }
    }
    contentDetails: {
      duration: string
    }
  }>
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.YOUTUBE_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${params.id}&part=snippet,contentDetails&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch video data')
    }

    const data: YouTubeVideoResponse = await response.json()

    if (data.items.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const video = data.items[0]

    return NextResponse.json({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      duration: parseDuration(video.contentDetails.duration),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500 }
    )
  }
}