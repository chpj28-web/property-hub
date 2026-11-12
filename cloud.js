/* Shared listings without a login. Public Supabase key only. */
window.cloud = (() => {
  let client;
  const status = text => { document.getElementById('connectionMessage').textContent = text; };
  function validate(items) {
    if (!Array.isArray(items)) throw new Error('ไฟล์ Backup ต้องเป็นรายการข้อมูล');
    const ids = new Set();
    return items.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('ข้อมูล Listing ไม่ถูกต้อง');
      const id = item.id || crypto.randomUUID();
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw new Error('รหัส Listing ไม่ถูกต้องหรือซ้ำกัน');
      ids.add(id);
      const clean = { id };
      for (const key of ['project','location','type','rent','sale','size','roomType','beds','baths','floor','available','received','contact','phone','line','source','status','link','notes']) {
        clean[key] = String(item[key] ?? '');
      }
      clean.photos = (Array.isArray(item.photos) ? item.photos : []).filter(p => typeof p === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(p));
      return clean;
    });
  }
  async function checked(request) {
    if (!client) throw new Error('Database is not connected');
    const result = await request;
    if (result.error) throw result.error;
    return result.data;
  }
  async function load() {
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const rows = await checked(client.from('shared_listings').select('id,data').order('created_at', { ascending: false }).order('id').range(offset, offset + 499));
      items.push(...rows.map(row => ({ ...row.data, id: row.id })));
      if (rows.length < 500) break;
    }
    return validate(items);
  }
  async function boot() {
    init();
    document.getElementById('app').hidden = false;
    document.getElementById('workspace').disabled = true;
    status('กำลังโหลดข้อมูล…');
    try {
      const config = window.PROPERTY_HUB_CONFIG;
      if (!config?.url || !config?.key) throw new Error('ยังไม่ได้ตั้งค่า Supabase');
      if (!window.supabase) throw new Error('โหลดระบบฐานข้อมูลไม่สำเร็จ กรุณารีเฟรช');
      client = window.supabase.createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      records = await load();
      render();
      document.getElementById('workspace').disabled = false;
      status('เชื่อมต่อแล้ว • รายการส่วนกลาง');
    } catch (error) {
      status('โหลดข้อมูลไม่สำเร็จ: ' + error.message + ' — กรุณารัน SQL สำหรับโหมดไม่ล็อกอินใน Supabase แล้วรีเฟรช');
    }
  }
  return {
    boot, load, validate,
    async save(item) {
      const [data] = validate([item]);
      await checked(client.from('shared_listings').upsert({ id: data.id, data }, { onConflict: 'id' }));
    },
    async remove(id) { await checked(client.from('shared_listings').delete().eq('id', id)); },
    async restore(items) { await checked(client.rpc('restore_shared_listings', { items: validate(items) })); }
  };
})();
