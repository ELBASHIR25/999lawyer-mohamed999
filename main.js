/* ==========================================================================
   سلوك عام لكل صفحات الموقع: القائمة، الروابط النشطة، تسجيل الزيارة
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* تسجيل الزيارة لأغراض لوحة التحكم (إن كان Firebase متاحًا) */
  if (typeof logVisit === 'function') {
    logVisit(document.title);
  }

  /* قائمة الموبايل */
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.style.display === 'flex';
      links.style.display = open ? 'none' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '68px';
      links.style.right = '0';
      links.style.left = '0';
      links.style.background = 'rgba(20,23,26,.98)';
      links.style.padding = '20px 28px';
      links.style.borderBottom = '1px solid var(--line)';
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  /* حالة تسجيل الدخول تُظهر رابط "لوحة التحكم" بدل "دخول" */
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(user => {
      const authLink = document.querySelector('[data-auth-link]');
      if (!authLink) return;
      if (user) {
        const admin = typeof isAdminUser === 'function' && isAdminUser(user);
        authLink.textContent = admin ? 'لوحة التحكم' : 'حسابي';
        authLink.href = admin ? 'dashboard.html' : 'booking.html';
      } else {
        authLink.textContent = 'تسجيل الدخول';
        authLink.href = 'auth.html';
      }
    });
  }

  /* كشف السكرول لتغميق الهيدر */
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.background = window.scrollY > 30 ? 'rgba(20,23,26,.92)' : 'rgba(20,23,26,.75)';
    });
  }

  /* ظهور تدريجي للعناصر عند التمرير */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.opacity = 1;
          en.target.style.transform = 'translateY(0)';
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => {
      el.style.opacity = 0;
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity .7s cubic-bezier(.16,.8,.24,1), transform .7s cubic-bezier(.16,.8,.24,1)';
      io.observe(el);
    });
  }
});
