/* Supabase Auth and per-user PostgreSQL persistence. No secret keys in the browser. */
window.cloud = (() => {
  let client, user;
  const status = text => { document.getElementById('authMessage').textContent = text; };
  function validate(items) {
    if (!Array.isArray(items)) throw new Error('ไฟล์ Backup ต้องเป็นรายการข้อมูล');
    const ids = new Set();
    return items.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('ข้อมูล Listing ไม่ถูกต้อง');
      const id = item.id || crypto.randomUUID();
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw new Error('รหัส Listing ไม่ถูกต้องหรือซ้ำกัน');
      ids.add(id);
      const clean = { id };
      for (const key of ['project','location','type','rent','sale','size','beds','baths','floor','available','received','contact','phone','line','source','status','link','notes']) {
        clean[key] = String(item[key] ?? '');
      }
      clean.photos = (Array.isArray(item.photos) ? item.photos : []).filter(p => typeof p === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(p));
      return clean;
    });
  }
  async function checked(request) {
    if (!client || !user) throw new Error('กรุณาเข้าสู่ระบบก่อน');
    const result = await request;
    if (result.error) throw result.error;
    return result.data;
  }
  async function load() {
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const rows = await checked(client.from('listings').select('id,data').order('created_at', { ascending: false }).order('id').range(offset, offset + 499));
      items.push(...rows.map(row => ({ ...row.data, id: row.id })));
      if (rows.length < 500) break;
    }
    return validate(items);
  }
  async function showSession(session) {
    user = session?.user || null;
    document.getElementById('app').hidden = true;
    records = [];
    resetForm();
    render();
    document.getElementById('authForm').hidden = !!user;
    document.getElementById('signout').hidden = !user;
    if (!user) { status('เข้าสู่ระบบเพื่อดูข้อมูลของคุณ'); return; }
    status('กำลังโหลดข้อมูล…');
    try {
      records = await load();
      render();
      document.getElementById('app').hidden = false;
      status(user.email);
    } catch (error) { status('โหลดข้อมูลไม่สำเร็จ: ' + error.message); }
  }
  async function boot() {
    init();
    document.getElementById('authForm').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      try {
        if (!client) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล');
        const { data, error } = await client.auth.signInWithPassword({ email: document.getElementById('email').value, password: document.getElementById('password').value });
        if (error) throw error;
        document.getElementById('password').value = '';
        await showSession(data.session);
      } catch (error) { status('เข้าสู่ระบบไม่สำเร็จ: ' + error.message); }
      finally { button.disabled = false; }
    });
    document.getElementById('signout').addEventListener('click', async () => {
      const { error } = await client.auth.signOut();
      if (error) { status(error.message); return; }
      await showSession(null);
    });
    try {
      const config = window.PROPERTY_HUB_CONFIG;
      if (!config?.url || !config?.key) throw new Error('ยังไม่ได้ตั้งค่า Supabase สำหรับแอปนี้');
      if (!window.supabase) throw new Error('โหลดระบบเข้าสู่ระบบไม่สำเร็จ กรุณารีเฟรช');
      client = window.supabase.createClient(config.url, config.key);
      client.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') setTimeout(() => showSession(null), 0);
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await showSession(data.session);
    } catch (error) { status(error.message); }
  }
  return {
    boot, load, validate,
    async save(item) {
      const [data] = validate([item]);
      await checked(client.from('listings').upsert({ owner_id: user.id, id: data.id, data }, { onConflict: 'owner_id,id' }));
    },
    async remove(id) { await checked(client.from('listings').delete().eq('id', id).eq('owner_id', user.id)); },
    async restore(items) { await checked(client.rpc('restore_listings', { items: validate(items) })); }
  };
})();
