function buildTaskTree(tasks) {
  const map = new Map();
  const roots = [];

  tasks.forEach((task) => {
    map.set(task.id, {
      ...task,
      children: []
    });
  });

  map.forEach((task) => {
    if (task.parent_id && map.has(task.parent_id)) {
      map.get(task.parent_id).children.push(task);
      return;
    }

    roots.push(task);
  });

  return roots;
}

module.exports = {
  buildTaskTree
};
