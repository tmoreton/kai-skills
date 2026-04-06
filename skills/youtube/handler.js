/**
 * YouTube Data API v3 Skill Handler
 *
 * Provides analytics and dashboard functionality for YouTube channels.
 * Works with Kai and Claude Desktop via MCP.
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const FETCH_TIMEOUT_MS = 15000;

let _config = {};

function getApiKey() {
  const key = _config.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY not configured. Get one at console.cloud.google.com/apis/credentials"
    );
  }
  return key;
}

async function youtubeApi(endpoint, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set("key", getApiKey());
  
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  
  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${err}`);
  }
  
  return response.json();
}

// Format numbers for display
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// Calculate engagement rate
function calculateEngagement(likes, comments, views) {
  if (!views || views === 0) return 0;
  return (((likes + comments) / views) * 100).toFixed(2);
}

export default {
  install: async (config) => {
    _config = config;
    // Validate API key works
    try {
      await youtubeApi("videos", { part: "snippet", id: "dQw4w9WgXcQ", maxResults: 1 });
    } catch (err) {
      throw new Error(`YouTube API key validation failed: ${err.message}`);
    }
  },

  uninstall: async () => {
    _config = {};
  },

  actions: {
    search_videos: async (params) => {
      const data = await youtubeApi("search", {
        part: "snippet",
        q: params.query || "",
        type: "video",
        order: params.order || "relevance",
        maxResults: String(params.max_results || 10),
        publishedAfter: params.published_after || "",
        ...(params.channel_id ? { channelId: params.channel_id } : {}),
      });

      const results = data.items?.map((item) => ({
        video_id: item.id?.videoId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        channel: item.snippet?.channelTitle,
        published_at: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.high?.url,
      })) || [];

      return { content: JSON.stringify(results, null, 2) };
    },

    get_video_stats: async (params) => {
      const videoIds = Array.isArray(params.video_ids)
        ? params.video_ids.join(",")
        : params.video_ids;

      const data = await youtubeApi("videos", {
        part: "statistics,snippet,contentDetails",
        id: videoIds,
      });

      const results = data.items?.map((item) => ({
        video_id: item.id,
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        views: Number(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
        engagement_rate: calculateEngagement(
          Number(item.statistics?.likeCount || 0),
          Number(item.statistics?.commentCount || 0),
          Number(item.statistics?.viewCount || 0)
        ),
        duration: item.contentDetails?.duration,
        tags: item.snippet?.tags || [],
        published_at: item.snippet?.publishedAt,
      })) || [];

      return { content: JSON.stringify(results, null, 2) };
    },

    get_channel: async (params) => {
      const data = await youtubeApi("channels", {
        part: "statistics,snippet,contentDetails",
        id: params.channel_id,
      });

      const results = data.items?.map((item) => ({
        channel_id: item.id,
        title: item.snippet?.title,
        description: item.snippet?.description,
        subscribers: Number(item.statistics?.subscriberCount || 0),
        subscribers_formatted: formatNumber(item.statistics?.subscriberCount || 0),
        total_views: Number(item.statistics?.viewCount || 0),
        total_views_formatted: formatNumber(item.statistics?.viewCount || 0),
        video_count: Number(item.statistics?.videoCount || 0),
        uploads_playlist: item.contentDetails?.relatedPlaylists?.uploads,
        thumbnail: item.snippet?.thumbnails?.high?.url,
      })) || [];

      return { content: JSON.stringify(results, null, 2) };
    },

    get_recent_uploads: async (params) => {
      // First get the uploads playlist ID
      const channelData = await youtubeApi("channels", {
        part: "contentDetails",
        id: params.channel_id,
      });

      const uploadsPlaylistId =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return { content: "[]", error: "No uploads playlist found" };
      }

      // Get videos from uploads playlist
      const playlistData = await youtubeApi("playlistItems", {
        part: "snippet",
        playlistId: uploadsPlaylistId,
        maxResults: String(params.max_results || 10),
      });

      const videoIds = playlistData.items
        ?.map((item) => item.snippet?.resourceId?.videoId)
        .filter(Boolean)
        .join(",");

      if (!videoIds) {
        return { content: "[]" };
      }

      // Get detailed stats for these videos
      const videoData = await youtubeApi("videos", {
        part: "statistics,snippet,contentDetails",
        id: videoIds,
      });

      const results = videoData.items?.map((item) => ({
        video_id: item.id,
        title: item.snippet?.title,
        views: Number(item.statistics?.viewCount || 0),
        views_formatted: formatNumber(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        likes_formatted: formatNumber(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
        engagement_rate: calculateEngagement(
          Number(item.statistics?.likeCount || 0),
          Number(item.statistics?.commentCount || 0),
          Number(item.statistics?.viewCount || 0)
        ),
        published_at: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.high?.url,
      })) || [];

      return { content: JSON.stringify(results, null, 2) };
    },

    get_trending: async (params) => {
      const data = await youtubeApi("videos", {
        part: "statistics,snippet",
        chart: "mostPopular",
        regionCode: params.region || "US",
        maxResults: String(params.max_results || 10),
        ...(params.category_id ? { videoCategoryId: params.category_id } : {}),
      });

      const results = data.items?.map((item) => ({
        video_id: item.id,
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        views: Number(item.statistics?.viewCount || 0),
        views_formatted: formatNumber(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        thumbnail: item.snippet?.thumbnails?.high?.url,
      })) || [];

      return { content: JSON.stringify(results, null, 2) };
    },

    // NEW: Get comments for engagement analysis
    get_comments: async (params) => {
      const data = await youtubeApi("commentThreads", {
        part: "snippet,replies",
        videoId: params.video_id,
        maxResults: String(Math.min(params.max_results || 20, 100)),
        order: "relevance",
      });

      const results = data.items?.map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;
        return {
          comment_id: item.id,
          author: snippet?.authorDisplayName,
          text: snippet?.textDisplay,
          likes: snippet?.likeCount,
          published_at: snippet?.publishedAt,
          reply_count: item.snippet?.totalReplyCount || 0,
        };
      }) || [];

      return {
        content: JSON.stringify(
          {
            video_id: params.video_id,
            total_comments: data.items?.length || 0,
            comments: results,
          },
          null,
          2
        ),
      };
    },

    // NEW: Compare multiple videos
    compare_videos: async (params) => {
      const videoIds = Array.isArray(params.video_ids)
        ? params.video_ids.join(",")
        : params.video_ids;

      const data = await youtubeApi("videos", {
        part: "statistics,snippet,contentDetails",
        id: videoIds,
      });

      const videos = data.items?.map((item) => ({
        video_id: item.id,
        title: item.snippet?.title,
        views: Number(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
        engagement_rate: calculateEngagement(
          Number(item.statistics?.likeCount || 0),
          Number(item.statistics?.commentCount || 0),
          Number(item.statistics?.viewCount || 0)
        ),
        published_at: item.snippet?.publishedAt,
      })) || [];

      // Calculate comparison metrics
      const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
      const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
      const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
      const avgEngagement = videos.length > 0 
        ? videos.reduce((sum, v) => sum + parseFloat(v.engagement_rate), 0) / videos.length 
        : 0;

      // Sort by views for ranking
      const ranked = [...videos].sort((a, b) => b.views - a.views);

      return {
        content: JSON.stringify(
          {
            comparison: {
              total_videos: videos.length,
              total_views: totalViews,
              total_views_formatted: formatNumber(totalViews),
              total_likes: totalLikes,
              total_comments: totalComments,
              avg_engagement_rate: avgEngagement.toFixed(2) + "%",
              best_performing: ranked[0] || null,
              worst_performing: ranked[ranked.length - 1] || null,
            },
            videos: ranked,
          },
          null,
          2
        ),
      };
    },

    // NEW: Generate comprehensive channel report
    generate_channel_report: async (params) => {
      const days = params.days || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Get channel info
      const channelData = await youtubeApi("channels", {
        part: "statistics,snippet,contentDetails",
        id: params.channel_id,
      });

      if (!channelData.items?.[0]) {
        return { content: "Channel not found", error: true };
      }

      const channel = channelData.items[0];
      
      // Get uploads
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      let recentVideos = [];
      
      if (uploadsPlaylistId) {
        const playlistData = await youtubeApi("playlistItems", {
          part: "snippet",
          playlistId: uploadsPlaylistId,
          maxResults: "50",
        });

        // Filter videos from last N days and get their stats
        const recentItems = playlistData.items?.filter(
          (item) => new Date(item.snippet?.publishedAt) > new Date(since)
        ) || [];

        if (recentItems.length > 0) {
          const videoIds = recentItems
            .map((item) => item.snippet?.resourceId?.videoId)
            .filter(Boolean)
            .join(",");

          const videoData = await youtubeApi("videos", {
            part: "statistics,snippet",
            id: videoIds,
          });

          recentVideos = videoData.items?.map((item) => ({
            video_id: item.id,
            title: item.snippet?.title,
            views: Number(item.statistics?.viewCount || 0),
            likes: Number(item.statistics?.likeCount || 0),
            comments: Number(item.statistics?.commentCount || 0),
            engagement_rate: calculateEngagement(
              Number(item.statistics?.likeCount || 0),
              Number(item.statistics?.commentCount || 0),
              Number(item.statistics?.viewCount || 0)
            ),
            published_at: item.snippet?.publishedAt,
          })) || [];
        }
      }

      // Calculate report metrics
      const totalViews = recentVideos.reduce((sum, v) => sum + v.views, 0);
      const totalLikes = recentVideos.reduce((sum, v) => sum + v.likes, 0);
      const totalComments = recentVideos.reduce((sum, v) => sum + v.comments, 0);
      const avgEngagement = recentVideos.length > 0
        ? recentVideos.reduce((sum, v) => sum + parseFloat(v.engagement_rate), 0) / recentVideos.length
        : 0;

      const report = {
        period: `Last ${days} days`,
        generated_at: new Date().toISOString(),
        channel: {
          id: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          subscribers: Number(channel.statistics?.subscriberCount || 0),
          subscribers_formatted: formatNumber(channel.statistics?.subscriberCount || 0),
          total_views_all_time: Number(channel.statistics?.viewCount || 0),
          total_videos: Number(channel.statistics?.videoCount || 0),
        },
        summary: {
          videos_published: recentVideos.length,
          total_views_period: totalViews,
          total_views_formatted: formatNumber(totalViews),
          total_likes: totalLikes,
          total_comments: totalComments,
          avg_engagement_rate: avgEngagement.toFixed(2) + "%",
          views_per_video_avg: recentVideos.length > 0 ? Math.round(totalViews / recentVideos.length) : 0,
        },
        top_performers: recentVideos
          .sort((a, b) => b.views - a.views)
          .slice(0, 5),
        recent_videos: recentVideos.sort(
          (a, b) => new Date(b.published_at) - new Date(a.published_at)
        ),
      };

      return { content: JSON.stringify(report, null, 2) };
    },
  },
};
