// ฟอร์มของขวัญที่ใช้ร่วมกันระหว่าง admin_gift_create.html (เพิ่ม) และ admin_gift_edit.html (แก้ไข)
// ช่อง image_url ของขวัญเดิมเป็นค่า 'url' (ไม่มีรูปจริง) -> หน้าเว็บวาดสติ๊กเกอร์จาก member-gift-stickers.js ตาม gift_id แทน
(function () {
  // ชื่อหมวดตรงกับแท็บหน้า Gift Sheet ฝั่งผู้ใช้ (majorvote_detail.html)
  const TIERS = [
    { key: 'Normal', label: 'Normal' },
    { key: 'MembersDesign', label: 'BLM48' },
    { key: 'NPT48Design', label: 'NPT48' }
  ];
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  function hasRealImage(url) {
    const s = String(url || '').trim();
    return /^(https?:)?\/\//i.test(s) || s.startsWith('assets/');
  }

  function giftImg(id, url, size) {
    const img = hasRealImage(url)
      ? `<img src="${escapeAttr(url)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;">`
      : `<i class="fa-solid fa-gift" style="font-size:${Math.round(size / 2.4)}px;color:#ddd;"></i>`;
    return window.blm48GiftImageHtml ? window.blm48GiftImageHtml(id, url, size, img) : img;
  }

  // ชิ้นนี้มีสติ๊กเกอร์ในแอปไหม (ไม่มี -> ต้องมีรูปจริง)
  function hasSticker(id) {
    return !!id && giftImg(id, '', 10).includes('gift-sticker');
  }

  // root = กล่องที่จะวาดฟอร์มลงไป / gift = ค่าเริ่มต้น (giftId ว่าง = ของขวัญใหม่)
  function create(root, gift, opts) {
    const g = Object.assign({ active: true }, gift || {});
    const isNew = !g.giftId;
    let imageUrl = hasRealImage(g.imageUrl) ? g.imageUrl : '';

    root.innerHTML = `
      <div id="gf-msg" class="msg"></div>
      <div class="form-field">
        <label>รูปของขวัญ</label>
        <div class="img-edit">
          <div class="g-img" id="gf-preview"></div>
          <div>
            <div class="img-btns" id="gf-img-btns"></div>
            <div class="note" id="gf-img-note" style="margin:6px 0 0;"></div>
          </div>
          <input type="file" id="gf-file" accept="image/*" style="display:none;">
        </div>
      </div>
      <div class="form-field"><label>ชื่อของขวัญ</label><input id="gf-name" type="text" maxlength="60" value="${escapeAttr(g.giftName || '')}"></div>
      <div class="form-field"><label>หมวด</label>
        <select id="gf-tier">${TIERS.map(t => `<option value="${t.key}" ${g.tier === t.key ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
      </div>
      <div class="row2">
        <div class="form-field"><label>ราคา (Cookie)</label><input id="gf-cost" type="number" inputmode="numeric" min="1" step="1" value="${g.costCookies ?? ''}"></div>
        <div class="form-field"><label>คะแนนโหวตที่ได้</label><input id="gf-points" type="number" inputmode="numeric" min="0" step="1" value="${g.points ?? ''}"></div>
      </div>
      <label class="check-label"><input type="checkbox" id="gf-active" ${g.active !== false ? 'checked' : ''}> เปิดขาย (ผู้ใช้ซื้อและส่งได้)</label>
      <button type="button" class="btn-primary" id="gf-save"><i class="fas fa-check"></i> ${isNew ? 'Add Gift' : 'Save'}</button>`;

    const $ = id => root.querySelector('#' + id);
    const sticker = hasSticker(g.giftId);

    function setMsg(text, kind) {
      const el = $('gf-msg');
      el.className = 'msg' + (text ? ' ' + (kind || 'error') : '');
      el.textContent = text || '';
    }

    function renderImage() {
      $('gf-preview').innerHTML = giftImg(g.giftId || '', imageUrl, 72);
      $('gf-img-btns').innerHTML =
        `<button type="button" class="btn-mini" data-act="pick"><i class="fa-solid fa-upload"></i> ${imageUrl ? 'Change' : 'Upload'}</button>` +
        (imageUrl ? `<button type="button" class="btn-mini" data-act="clear">${sticker ? 'ใช้สติ๊กเกอร์เดิม' : 'Remove'}</button>` : '');
      $('gf-img-note').textContent = sticker && !imageUrl ? 'ตอนนี้ใช้สติ๊กเกอร์ในแอป · อัปโหลดรูปเพื่อใช้รูปแทน' : 'PNG พื้นใส ไม่เกิน 5MB';
    }

    $('gf-img-btns').addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'pick') $('gf-file').click();
      else { imageUrl = ''; renderImage(); }
    });

    $('gf-file').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) { setMsg('กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 5MB'); return; }
      setMsg('Uploading...', 'ok');
      try {
        imageUrl = await blm48UploadImageToBucket('app-assets', 'gift-' + (g.giftId || 'new'), file);
        renderImage();
        setMsg(`อัปโหลดรูปแล้ว กด ${isNew ? 'Add Gift' : 'Save'} เพื่อบันทึก`, 'ok');
      } catch (err) {
        console.error('Gift image upload error:', err);
        setMsg('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    });

    $('gf-save').addEventListener('click', async () => {
      const f = {
        giftName: $('gf-name').value.trim(),
        tier: $('gf-tier').value,
        costCookies: $('gf-cost').value === '' ? null : Number($('gf-cost').value),
        points: $('gf-points').value === '' ? null : Number($('gf-points').value),
        active: $('gf-active').checked,
        imageUrl: imageUrl || null
      };
      if (!f.giftName) return setMsg('กรุณากรอกชื่อของขวัญ');
      if (!Number.isInteger(f.costCookies) || f.costCookies < 1) return setMsg('ราคา Cookie ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
      if (!Number.isInteger(f.points) || f.points < 0) return setMsg('คะแนนโหวตต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      if (!f.imageUrl && !sticker) return setMsg('กรุณาอัปโหลดรูปของขวัญ');

      const btn = $('gf-save');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      try {
        const res = await blm48AdminSaveGift(opts.username, g.giftId || null, f);
        if (res && res.status === 'success') {
          setMsg(res.message || 'บันทึกเรียบร้อยแล้ว', 'ok');
          if (opts.onSaved) opts.onSaved(res, f);
        } else {
          setMsg((res && res.message) || 'บันทึกไม่สำเร็จ');
        }
      } catch (err) {
        setMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง');
      }
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-check"></i> ${isNew ? 'Add Gift' : 'Save'}`;
    });

    renderImage();
    return { setMsg };
  }

  window.BLM48_GIFT_TIERS = TIERS;
  window.blm48AdminGiftImg = giftImg;
  window.blm48AdminGiftForm = create;
})();
