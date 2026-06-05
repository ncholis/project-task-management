const env = require('../../config/env');
const redis = require('../../config/redis');

function getTaskTreeCacheKey(projectId) {
  return `task_tree:project:${projectId}`;
}

async function getCachedTaskTree(projectId) {
  try {
    const cached = await redis.get(getTaskTreeCacheKey(projectId));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to read task tree cache:', error.message);
    return null;
  }
}

async function setCachedTaskTree(projectId, tree) {
  try {
    await redis.set(
      getTaskTreeCacheKey(projectId),
      JSON.stringify(tree),
      'EX',
      env.CACHE_TTL_SECONDS
    );
  } catch (error) {
    console.error('Failed to write task tree cache:', error.message);
  }
}

async function invalidateTaskTreeCache(projectId) {
  if (!projectId) return;

  try {
    // Cache invalidation prevents stale tree view after any task mutation or overdue worker update.
    await redis.del(getTaskTreeCacheKey(projectId));
  } catch (error) {
    console.error('Failed to invalidate task tree cache:', error.message);
  }
}

module.exports = {
  getTaskTreeCacheKey,
  getCachedTaskTree,
  setCachedTaskTree,
  invalidateTaskTreeCache
};
