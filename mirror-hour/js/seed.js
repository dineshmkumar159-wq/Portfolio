/* Sample data for "Mirror Hour Salon & Studio" (imaginary). Shared by the server and the browser demo. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.SalonSeed = f(); })(typeof self !== 'undefined' ? self : this, function () {
  // services: [name, category, description, price, minutes, emoji]
  const services = [
    ['Haircut (women)', 'Hair', 'Consultation, wash, cut and a quick blow-dry.', 500, 45, '✂️'],
    ['Haircut (men)', 'Hair', 'Precision cut with wash and style.', 250, 30, '💈'],
    ['Blow-dry & styling', 'Hair', 'Smooth waves or a sleek finish for any occasion.', 600, 40, '💨'],
    ['Hair spa', 'Hair', 'Deep conditioning, scalp massage and steam.', 900, 60, '🌿'],
    ['Global colour', 'Hair', 'Full-head colour with ammonia-free shades.', 2800, 120, '🎨'],
    ['Highlights', 'Hair', 'Hand-painted highlights, toner and finish.', 3500, 150, '✨'],
    ['Keratin smoothing', 'Hair', 'Frizz-free, glossy hair that lasts for months.', 4500, 150, '🪞'],
    ['Classic facial', 'Skin', 'Cleanse, exfoliate, massage and mask.', 1200, 60, '🧖'],
    ['Gold glow facial', 'Skin', 'Brightening 24k gold facial for festive skin.', 2200, 75, '🏅'],
    ['De-tan clean-up', 'Skin', 'Removes tan and dullness in under an hour.', 900, 45, '☀️'],
    ['Full arms waxing', 'Skin', 'Gentle rica wax, soothing finish.', 500, 30, '🌸'],
    ['Threading (brows)', 'Skin', 'Clean, shaped brows.', 60, 10, '🧵'],
    ['Manicure', 'Nails', 'Shape, cuticle care, scrub and polish.', 600, 45, '💅'],
    ['Pedicure', 'Nails', 'Soak, scrub, massage and polish.', 800, 60, '🦶'],
    ['Gel nail art', 'Nails', 'Long-lasting gel colour with hand-painted art.', 1500, 75, '💎'],
    ['Bridal makeup trial', 'Bridal', 'A full trial look so the big day has no surprises.', 3500, 90, '👰'],
    ['Beard trim & style', 'Men', 'Shape, trim and hot-towel finish.', 200, 20, '🧔'],
    ['Head massage', 'Men', 'Relaxing oil massage for stress relief.', 400, 30, '💆'],
  ];
  // stylists: name, role, emoji, color, bio, pin, days(0=Sun), start, end (minutes), skills(service numbers)
  const stylists = [
    ['Ananya', 'Senior hair stylist', '🌸', '#e07a9a', 'Twelve years of cuts, styling and keratin work.', '2101', [1, 2, 3, 4, 5, 6], 600, 1140, [1, 3, 4, 7]],
    ['Karthik', "Men's grooming expert", '💈', '#4f7cac', 'Sharp fades, beard design and relaxing head massages.', '2102', [2, 3, 4, 5, 6, 0], 660, 1200, [2, 17, 18, 4]],
    ['Meena', 'Skin and facial specialist', '🌿', '#5aa58a', 'Calm hands and a gift for glowing skin.', '2103', [1, 2, 3, 4, 5, 6], 600, 1080, [8, 9, 10, 11, 12]],
    ['Divya', 'Nail artist', '💅', '#b66fd1', 'Detailed nail art and spa-style manicures.', '2104', [3, 4, 5, 6, 0], 660, 1140, [13, 14, 15]],
    ['Farhan', 'Colour specialist', '🎨', '#e0903a', 'Balayage, highlights and bold fashion colours.', '2105', [1, 2, 3, 4, 5, 6], 720, 1200, [5, 6, 1, 3, 4]],
    ['Lakshmi', 'Bridal makeup artist', '👰', '#c9577a', 'Bridal and party makeup that photographs beautifully.', '2106', [2, 3, 4, 5, 6, 0], 600, 1080, [16, 8, 9]],
  ];
  return {
    salon: { name: 'Mirror Hour Salon & Studio', tagline: 'Look like the best hour of your day.', hours: '10:00 AM to 8:00 PM', phone: '+91 44 4000 0000', address: '12, Lotus Street, Nungambakkam, Chennai', deposit: 100 },
    services: services.map((s, i) => ({ id: i + 1, name: s[0], cat: s[1], descr: s[2], price: s[3], mins: s[4], emoji: s[5] })),
    stylists: stylists.map((s, i) => ({ id: i + 1, name: s[0], role: s[1], emoji: s[2], color: s[3], bio: s[4], pin: s[5], days: s[6], start: s[7], end: s[8], skills: s[9] })),
    offers: [
      { title: 'Weekday treat: 15% off Monday to Thursday', type: 'auto', kind: 'percent', value: 15, cap: 400, min: 600, days: [1, 2, 3, 4], service_id: 0 },
      { title: '20% off your first visit', type: 'coupon', code: 'FIRST20', kind: 'percent', value: 20, cap: 300, min: 500, days: [], service_id: 0 },
      { title: '₹200 off bookings above ₹1,500', type: 'coupon', code: 'GLOW200', kind: 'flat', value: 200, cap: 0, min: 1500, days: [], service_id: 0 },
      { title: 'Mani-pedi week: 25% off gel nail art', type: 'coupon', code: 'NAILS25', kind: 'percent', value: 25, cap: 400, min: 0, days: [], service_id: 15 },
    ],
    ownerPassword: 'mirror123',
  };
});
