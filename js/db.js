
// db.js - Generic CRUD wrapper over localStorage
const DB = (() => {
  const COLLECTIONS = ['users','students','courses','enrollments','waitlist','payments','notifications'];

  function get(collection) {
    const raw = localStorage.getItem(collection);
    return raw ? JSON.parse(raw) : [];
  }

  function set(collection, arr) {
    localStorage.setItem(collection, JSON.stringify(arr));
  }

  function getById(collection, id) {
    return get(collection).find(item => item.id === id) || null;
  }

  function add(collection, obj) {
    const arr = get(collection);
    if (!obj.id) obj.id = collection.slice(0,1) + Date.now() + Math.floor(Math.random()*1000);
    arr.push(obj);
    set(collection, arr);
    return obj;
  }

  function update(collection, id, updates) {
    const arr = get(collection);
    const idx = arr.findIndex(item => item.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...updates };
    set(collection, arr);
    return arr[idx];
  }

  function remove(collection, id) {
    const arr = get(collection).filter(item => item.id !== id);
    set(collection, arr);
  }

  return { COLLECTIONS, get, set, getById, add, update, remove };
})();
