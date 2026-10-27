import re, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
src = open('index.html').read()
header = re.search(r'<a class="skip".*?</header>', src, re.S).group(0)
footer = re.search(r'<footer class="site-footer">.*?</footer>', src, re.S).group(0)
fonts = '''<link rel="icon" type="image/png" href="/logos/ai-logo-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">'''

def page(path, title, desc, canon, body, nav=None, robots=None):
    h = header
    if nav:
        h = h.replace(f'href="{nav}"', f'href="{nav}" aria-current="page"', 1)
    meta_robots = f'\n<meta name="robots" content="{robots}">' if robots else ''
    html = f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">{meta_robots}
<link rel="canonical" href="https://artificialintegration.io{canon}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://artificialintegration.io{canon}">
<meta property="og:image" content="https://artificialintegration.io/logos/ai-logo.png">
<meta name="theme-color" content="#FAFAF7">
{fonts}
</head>
<body>
{h}

<main id="main">
{body}
</main>

{footer}
</body>
</html>
'''
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'w').write(html)

band = '''<section class="band">
  <div class="wrap">
    <div>
      <h2>{h}<span class="dot">.</span></h2>
      <p class="lede mt">{p}</p>
    </div>
    <div class="cta-row">
      <a href="/book" class="btn">Book a demo <span class="arrow">→</span></a>
      <a href="mailto:hello@artificialintegration.io" class="btn ghost">hello@artificialintegration.io</a>
    </div>
  </div>
</section>'''

# ---------------- PRICING ----------------
pricing = '''<section class="hero first">
  <div class="wrap price-wrap">
    <div>
      <span class="eyebrow">Pricing</span>
      <h1>Flat monthly<span class="dot">.</span><br>No per-minute maths<span class="dot">.</span></h1>
      <p class="lede">One plan covers the receptionist, the setup, and ongoing tuning. Cancel any time.</p>
    </div>
    <div class="price-card">
      <div class="plan">Receptionist</div>
      <!-- TODO(pricing): replace £XX and confirm fair-use minutes before launch -->
      <div class="price"><span class="amt">£XX</span><span class="per">/ month + VAT</span></div>
      <div class="sub">Monthly rolling · no setup fee · cancel any time</div>
      <ul class="ticks">
        <li>Answers on your existing number, 24/7 or on your schedule</li>
        <li>Trained on your services, prices, area, and hours</li>
        <li>SMS + email summary after every call</li>
        <li>Urgent call transfer to your mobile</li>
        <li>Transcripts and recordings</li>
        <li>Built, tested, and tuned for you by us</li>
        <li>Changes on request — new services, hours, prices</li>
      </ul>
      <a href="/book" class="btn">Book a demo <span class="arrow">→</span></a>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head">
      <div>
        <span class="eyebrow">Compare</span>
        <h2>How it stacks up<span class="dot">.</span></h2>
      </div>
      <p>The options most small businesses weigh up when they can't get to the phone.</p>
    </div>
    <table class="compare">
      <thead><tr><th>Option</th><th>Cost model</th><th>Out of hours</th><th>Knows your business</th></tr></thead>
      <tbody>
        <tr class="us"><td>AI receptionist</td><td>Flat monthly</td><td>Yes</td><td>Trained on it</td></tr>
        <tr><td>Voicemail</td><td>Free</td><td>Callers rarely leave one</td><td>No</td></tr>
        <tr><td>Answering service</td><td>Per call or per minute</td><td>Often extra</td><td>Generic script</td></tr>
        <tr><td>Part-time receptionist</td><td>Salary, holiday, cover</td><td>No</td><td>Yes, once trained</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Billing FAQ</span><h2>Billing<span class="dot">.</span></h2></div></div>
    <div class="faq">
      <details><summary>Is there a setup fee?</summary><div class="a"><p>No. Setup and the first round of tuning are included.</p></div></details>
      <details><summary>Is there a minimum term?</summary><div class="a"><p>No. Billing is monthly and you can cancel before your next billing date.</p></div></details>
      <details><summary>Are there call or minute limits?</summary><div class="a"><p>The plan includes a fair-use allowance sized for small and medium businesses. If you consistently go well beyond it, we'll talk to you before anything changes.</p></div></details>
      <details><summary>Do you work with larger or multi-site teams?</summary><div class="a"><p>Yes — multiple numbers, routing by location, and CRM or booking-system integrations are scoped per project. <a href="mailto:hello@artificialintegration.io">Get in touch</a>.</p></div></details>
    </div>
  </div>
</section>
''' + band.format(h='See it answer as your business', p='15 minutes. We set up a test receptionist for your business before the call.')
page('pricing/index.html', 'Pricing · AI Receptionist · Artificial Integration',
     'One flat monthly plan for an AI receptionist on your existing number. No setup fee, no contract.',
     '/pricing/', pricing, nav='/pricing/')

# ---------------- REMOVALS ----------------
removals = '''<section class="hero first">
  <div class="wrap">
    <div>
      <span class="eyebrow">For removals companies</span>
      <h1>Quote requests don't wait for you to finish the job<span class="dot">.</span></h1>
      <p class="lede">You're mid-move, carrying a sofa down three flights. The next customer rings, gets voicemail, and books the firm that picked up. An AI receptionist takes that call and hands you a ready-to-quote lead.</p>
      <div class="cta-row">
        <a href="/book" class="btn">Book a 15-min demo <span class="arrow">→</span></a>
        <a href="/pricing/" class="btn ghost">Pricing</a>
      </div>
      <p class="fine"><span>Keep your number</span><span>Set up for you</span><span>No contract</span></p>
    </div>
    <div class="card" aria-label="Example removals lead summary">
      <div class="card-head"><span class="live">New lead · 14:12</span><span>while you were on a job</span></div>
      <div class="summary">
        <div class="summary-title">Lead summary</div>
        <ul class="kv">
          <li><span class="k">type</span><span><span class="tag">new lead</span></span></li>
          <li><span class="k">move</span><span>2-bed flat → 3-bed house</span></li>
          <li><span class="k">from / to</span><span>Romford RM7 → Brentwood CM14</span></li>
          <li><span class="k">date</span><span>Sat 14th, completion day</span></li>
          <li><span class="k">access</span><span>2nd floor, no lift · driveway at destination</span></li>
          <li><span class="k">extras</span><span>Packing service · 1 wardrobe to dismantle</span></li>
          <li><span class="k">next</span><span>Wants a video survey this week</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">What it asks</span><h2>The questions you'd ask<span class="dot">.</span></h2></div>
      <p>Configured with the details a removals quote actually needs, so you call back ready to price it.</p>
    </div>
    <div class="grid">
      <div><span class="ico">01</span><h3>Property and volume</h3><p>Bedrooms, property type, rough inventory, anything unusual.</p></div>
      <div><span class="ico">02</span><h3>Dates</h3><p>Move date, completion day, flexibility, key collection.</p></div>
      <div><span class="ico">03</span><h3>Access</h3><p>Floors, lifts, parking, permits, narrow lanes.</p></div>
      <div><span class="ico">04</span><h3>Extras</h3><p>Packing, dismantling, storage, pianos, fragile items.</p></div>
      <div><span class="ico">05</span><h3>Route</h3><p>From and to postcodes, so you can check distance and crew.</p></div>
      <div><span class="ico">06</span><h3>Survey</h3><p>Whether they want a home or video survey, and when suits.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap split">
    <div>
      <span class="eyebrow">Day of the move</span>
      <h2>Existing customers get through<span class="dot">.</span></h2>
      <p class="lede mt">Customers on move day can be put straight through to you or the crew lead. New enquiries are captured and summarised.</p>
    </div>
    <ul class="ticks">
      <li>Move-day calls transferred to your mobile</li>
      <li>New quote requests captured with full details</li>
      <li>After-hours enquiries answered, not lost</li>
      <li>Spam and sales calls filtered out</li>
    </ul>
  </div>
</section>
''' + band.format(h='Hear it take a removals enquiry', p='We set up a test receptionist with your company name before the demo.')
page('removals/index.html', 'AI Receptionist for Removals Companies · Artificial Integration',
     'An AI receptionist for UK removals companies. Captures move size, dates, access, and extras while you are on a job.',
     '/removals/', removals)

# ---------------- LEGAL STUBS ----------------
def stub(path, h, canon):
    body = f'''<section class="first">
  <div class="wrap prose">
    <span class="eyebrow">Legal</span>
    <h1>{h}</h1>
    <p class="notice">This document is being finalised. For any question about how we handle your data, email <a href="mailto:hello@artificialintegration.io">hello@artificialintegration.io</a>.</p>
  </div>
</section>'''
    # TODO(legal): replace with reviewed policy text before taking paying customers
    page(path, f'{h} · Artificial Integration', f'{h} for Artificial Integration.', canon, body, robots='noindex')
stub('privacy/index.html', 'Privacy policy', '/privacy/')
stub('terms/index.html', 'Terms of service', '/terms/')

# ---------------- 404 ----------------
nf = '''<section class="first">
  <div class="wrap prose">
    <span class="eyebrow">404</span>
    <h1>Not found<span class="dot">.</span></h1>
    <p>That page doesn't exist. <a href="/">Back to the homepage</a>.</p>
  </div>
</section>'''
page('404.html', 'Not found · Artificial Integration', 'Page not found.', '/404.html', nf, robots='noindex')
print('built')

# ---------------- CONTACT ----------------
contact = '''<section class="hero first">
  <div class="wrap">
    <div class="prose">
      <span class="eyebrow">Book a demo</span>
      <h1>Hear it answer as your business<span class="dot">.</span></h1>
      <p class="lede">Send your business name and website. We'll set up a test receptionist and book a 15-minute call to walk you through it.</p>
      <p class="mt"><a class="btn" href="mailto:hello@artificialintegration.io?subject=AI%20receptionist%20demo&amp;body=Business%20name%3A%0AWebsite%3A%0ABest%20number%3A%0A">Email to book <span class="arrow">→</span></a></p>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <ul class="contact-rows">
      <li><span class="k">Email</span><a href="mailto:hello@artificialintegration.io">hello@artificialintegration.io</a></li>
      <!-- TODO(contact): add demo line number (route to a live receptionist so prospects can call it) -->
      <li><span class="k">Studio</span><span>London, UK</span></li>
      <li><span class="k">Response</span><span>Same working day</span></li>
    </ul>
  </div>
</section>'''
page('contact/index.html', 'Book a Demo · Artificial Integration',
     'Book a 15-minute demo of an AI receptionist set up for your business.', '/contact/', contact, nav='/book')
print('contact built')
