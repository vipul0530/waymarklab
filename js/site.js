/* =========================================================
   Waymark Lab. Vanilla JavaScript, no dependencies.
   ========================================================= */
(function(){
  "use strict";

  /* ---------- mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.getElementById("navPanel");
  if (toggle && panel){
    var setOpen = function(open){
      toggle.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("open", open);
    };
    toggle.addEventListener("click", function(){
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    panel.addEventListener("click", function(ev){
      if (ev.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function(ev){
      if (ev.key === "Escape" && toggle.getAttribute("aria-expanded") === "true"){
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function(){
      if (window.innerWidth > 1000) setOpen(false);
    });
  }

  /* ---------- the plate: step through a concept's three screens ---------- */
  document.querySelectorAll("[data-plate]").forEach(function(plate){
    var imgs = plate.querySelectorAll(".shot-frame img");
    var btns = plate.querySelectorAll(".steps-mini button");
    var name = plate.querySelector(".nm");
    if (!imgs.length || !btns.length) return;
    function show(i){
      imgs.forEach(function(img, n){ img.hidden = (n !== i); });
      btns.forEach(function(b, n){ b.setAttribute("aria-pressed", String(n === i)); });
      if (name) name.textContent = btns[i].dataset.name || "";
    }
    btns.forEach(function(b, i){ b.addEventListener("click", function(){ show(i); }); });
    show(0);
  });

  /* ---------- process review form ----------
     The form posts to Netlify Forms in production. Locally there is no
     handler, so the catch shows the email fallback rather than pretending
     the message was sent. */
  var form = document.getElementById("scopeForm");
  if (form){
    var thanks = document.getElementById("formThanks");
    var failed = document.getElementById("formFallback");

    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      var data = new FormData(form);
      if (data.get("bot-field")) return;               // honeypot

      var body = new URLSearchParams();
      data.forEach(function(v, k){ body.append(k, v); });

      var done = function(ok){
        if (ok){
          form.hidden = true;
          if (failed) failed.hidden = true;
          if (thanks){ thanks.hidden = false; thanks.setAttribute("tabindex", "-1"); thanks.focus(); }
        } else if (failed){
          var lines = [
            "Process: " + (data.get("process") || ""),
            "Who runs it: " + (data.get("role") || ""),
            "Systems: " + (data.get("systems") || ""),
            "Company: " + (data.get("company") || ""),
            "Name: " + (data.get("name") || ""),
            "Email: " + (data.get("email") || ""),
            "Phone: " + (data.get("phone") || "")
          ].join("\n");
          var link = failed.querySelector("a");
          if (link){
            link.href = "mailto:info@waymarklab.com?subject=" +
              encodeURIComponent("Process review request") +
              "&body=" + encodeURIComponent(lines);
          }
          failed.hidden = false;
          failed.setAttribute("tabindex", "-1");
          failed.focus();
        }
      };

      fetch(window.location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }).then(function(r){ done(r.ok); }).catch(function(){ done(false); });
    });
  }

  /* ---------- the header earns its border once the page moves ---------- */
  var head = document.querySelector(".site-head");
  if (head){
    var onScroll = function(){ head.classList.toggle("is-stuck", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- scroll reveal ----------
     The class goes on <html> only when we can actually observe, so a
     browser without IntersectionObserver, or a reader who asked for
     reduced motion, never gets hidden content. */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !still){
    var targets = document.querySelectorAll(
      ".hero-grid > *, .section-head, .card, .work-card, .step, .figures > div," +
      " .feature, .ba figure, .ba-cap, .note-line, .who li, .why-grid > p," +
      " .faq, .placeholder, .closing, .case-meta, .plate, .details-grid figure"
    );
    if (targets.length){
      document.documentElement.classList.add("js-reveal");
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (!e.isIntersecting) return;
          // a small stagger inside each row reads as one motion, not twelve
          var i = Number(e.target.dataset.revealIndex || 0);
          e.target.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

      targets.forEach(function(el){
        el.classList.add("reveal");
        var sibs = el.parentElement ? el.parentElement.children : [];
        el.dataset.revealIndex = String(Array.prototype.indexOf.call(sibs, el));
        io.observe(el);
      });

      // anything still hidden after two seconds gets shown regardless
      window.setTimeout(function(){
        document.querySelectorAll(".reveal:not(.in)").forEach(function(el){
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight) el.classList.add("in");
        });
      }, 2000);
    }
  }
})();
