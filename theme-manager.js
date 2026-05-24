const festivalThemes = {
    5: { // เดือนมิถุนายน
        name: 'pride-month',
        colors: {
            '--blm-pink': '#ff9a9e',
            '--bg-dreamy': 'linear-gradient(135deg, #f6d365, #fda085, #f093fb, #84fab0)',
            '--text-dark': '#333'
        }
    },
    12: { // เดือนธันวาคม (ตัวอย่างคริสต์มาส)
        name: 'christmas-month',
        colors: {
            '--blm-pink': '#d42426',
            '--bg-dreamy': '#e8f5e9',
            '--text-dark': '#1b5e20'
        }
    }
    // เพิ่มเดือนอื่นๆ ได้ตามใจชอบเลยงับ
};

function applyFestivalTheme() {
    const currentMonth = new Date().getMonth() + 1;
    const theme = festivalThemes[currentMonth];
    
    if (theme) {
        const root = document.documentElement;
        for (let prop in theme.colors) {
            root.style.setProperty(prop, theme.colors[prop]);
        }
    }
}

document.addEventListener('DOMContentLoaded', applyFestivalTheme);
