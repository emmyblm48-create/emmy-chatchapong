// 🎞️ ปกแบบเคลื่อนไหวรายเมมเบอร์ (key = ชื่อเมมเบอร์ตัวเล็ก) ใช้ทั้งหน้า member.html และ profile.html
// เล่น MP4 ถ้าเล่นไม่ได้ (เช่น iPhone โหมดประหยัดพลังงาน) จะสลับเป็น GIF แทน
const ANIMATED_COVERS = {
  emmy: {
    mp4: 'assets/img/member-cover/emmy-tartan.mp4',
    gif: 'assets/img/member-cover/emmy-tartan.gif',
    poster: 'assets/img/member-cover/emmy-tartan.jpg'
  }
};

// คืนค่า true ถ้าเมมเบอร์คนนี้มีปกเคลื่อนไหว (จะได้ไม่ทับด้วยรูป cover ปกติ)
function applyAnimatedCover(name, imgEl, videoEl) {
  const cover = ANIMATED_COVERS[String(name || '').trim().toLowerCase()];
  if (!cover || !imgEl || !videoEl) return false;

  imgEl.classList.remove('skeleton', 'skeleton-avatar');
  if (videoEl.parentElement) videoEl.parentElement.classList.add('has-animated-cover'); // ให้หน้าเพจจัดกรอบปกแบบเดียวกับหน้า profile ได้
  if (videoEl.dataset.src === cover.mp4) return true; // ตั้งไว้แล้ว ไม่ต้องโหลดใหม่ (กันวิดีโอกระตุกตอนรีเฟรชข้อมูล)

  const useGif = () => {
    videoEl.pause();
    videoEl.style.display = 'none';
    imgEl.style.display = '';
    imgEl.src = cover.gif;
  };
  videoEl.dataset.src = cover.mp4;
  videoEl.poster = cover.poster;
  videoEl.muted = true; // ต้องตั้งผ่าน JS ด้วย iOS ถึงยอม autoplay
  videoEl.onerror = useGif;
  videoEl.src = cover.mp4;
  videoEl.style.display = 'block';
  imgEl.style.display = 'none';
  const playing = videoEl.play();
  if (playing && playing.catch) playing.catch(useGif);
  return true;
}
