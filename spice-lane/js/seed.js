/* Sample data for "Spice Lane Food Court" (imaginary). Shared by the server and the browser demo. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.FoodSeed = factory(); })(this, function () {
  'use strict';
  /* item: [name, description, price, veg(1/0), category, emoji, stock (null = not tracked)] */
  var SHOPS = [
    { id: 1, name: 'Dosa Junction', cuisine: 'South Indian', emoji: '🥞', color: '#FF9F1C', pin: '1111', blurb: 'Crisp dosas and soft idlis, made on a hot tawa.', items: [
      ['Masala Dosa', 'Crisp dosa, potato masala, two chutneys', 90, 1, 'Dosa', '🥞', 40], ['Ghee Podi Dosa', 'Spicy gunpowder and ghee roast', 110, 1, 'Dosa', '🥞', 30],
      ['Plain Idli (3)', 'Steamed idlis with sambar', 60, 1, 'Tiffin', '🍚', 50], ['Medu Vada (2)', 'Crunchy lentil doughnuts', 55, 1, 'Tiffin', '🍩', 40],
      ['Pongal', 'Ghee pongal with coconut chutney', 80, 1, 'Tiffin', '🍲', 25], ['Egg Dosa', 'Dosa topped with spiced egg', 110, 0, 'Dosa', '🍳', 25],
      ['Mini Tiffin Combo', 'Idli, vada, pongal, kesari', 150, 1, 'Combos', '🍱', 20], ['Filter Coffee', 'Strong South Indian decoction coffee', 35, 1, 'Drinks', '☕', null]] },
    { id: 2, name: 'Biryani Bazaar', cuisine: 'Biryani', emoji: '🍛', color: '#E63946', pin: '2222', blurb: 'Dum-cooked biryani, sealed and slow.', items: [
      ['Chicken Dum Biryani', 'Basmati, chicken, raita, brinjal curry', 220, 0, 'Biryani', '🍛', 45], ['Mutton Biryani', 'Tender mutton, slow dum', 300, 0, 'Biryani', '🍛', 25],
      ['Veg Biryani', 'Vegetables, saffron rice, raita', 170, 1, 'Biryani', '🍚', 30], ['Egg Biryani', 'Boiled eggs on masala rice', 180, 0, 'Biryani', '🥚', 30],
      ['Chicken 65', 'Crisp curry-leaf fried chicken', 180, 0, 'Starters', '🍗', 35], ['Paneer 65', 'Spiced fried paneer', 170, 1, 'Starters', '🧀', 25],
      ['Raita Cup', 'Cool onion raita', 30, 1, 'Sides', '🥣', null], ['Gulab Jamun (2)', 'Warm syrup-soaked dumplings', 50, 1, 'Dessert', '🍮', 40]] },
    { id: 3, name: 'Burger Barn', cuisine: 'Burgers & Fries', emoji: '🍔', color: '#F4A261', pin: '3333', blurb: 'Stacked burgers, loaded fries, thick shakes.', items: [
      ['Classic Veg Burger', 'Crispy patty, lettuce, house sauce', 120, 1, 'Burgers', '🍔', 40], ['Cheese Chicken Burger', 'Grilled chicken, double cheese', 170, 0, 'Burgers', '🍔', 40],
      ['Aloo Tikki Burger', 'Spiced potato patty, mint mayo', 100, 1, 'Burgers', '🥔', 35], ['Peri Peri Fries', 'Crinkle fries, peri peri dust', 90, 1, 'Sides', '🍟', 60],
      ['Loaded Cheese Fries', 'Cheese sauce, jalapeños', 130, 1, 'Sides', '🍟', 30], ['Chicken Nuggets (6)', 'Golden nuggets, dip', 130, 0, 'Sides', '🍗', 40],
      ['Chocolate Shake', 'Thick chocolate shake', 130, 1, 'Drinks', '🥤', 30], ['Cold Coffee', 'Iced coffee with cream', 110, 1, 'Drinks', '🧋', 30]] },
    { id: 4, name: 'Pizza Piazza', cuisine: 'Pizza & Pasta', emoji: '🍕', color: '#D62828', pin: '4444', blurb: 'Stone-baked pizzas and creamy pastas.', items: [
      ['Margherita Pizza', 'Tomato, mozzarella, basil', 199, 1, 'Pizza', '🍕', 30], ['Farmhouse Pizza', 'Mushroom, capsicum, olives, corn', 249, 1, 'Pizza', '🍕', 25],
      ['Chicken Tikka Pizza', 'Tandoori chicken, onion, mozzarella', 289, 0, 'Pizza', '🍕', 25], ['White Sauce Pasta', 'Penne in creamy sauce', 160, 1, 'Pasta', '🍝', 30],
      ['Arrabbiata Pasta', 'Spicy tomato penne', 150, 1, 'Pasta', '🍝', 30], ['Garlic Bread', 'Cheesy garlic bread (4)', 110, 1, 'Sides', '🥖', 40],
      ['Brownie Sundae', 'Warm brownie, vanilla ice cream', 140, 1, 'Dessert', '🍨', 20], ['Fresh Lime Soda', 'Sweet or salted', 60, 1, 'Drinks', '🍋', null]] },
    { id: 5, name: 'Wok This Way', cuisine: 'Indo-Chinese', emoji: '🥡', color: '#2A9D8F', pin: '5555', blurb: 'Smoky wok-tossed noodles and rice.', items: [
      ['Veg Hakka Noodles', 'Wok-tossed noodles and vegetables', 130, 1, 'Noodles', '🍜', 40], ['Chicken Hakka Noodles', 'Noodles with shredded chicken', 160, 0, 'Noodles', '🍜', 40],
      ['Schezwan Fried Rice', 'Spicy schezwan rice', 150, 1, 'Rice', '🍚', 35], ['Chicken Fried Rice', 'Egg and chicken fried rice', 170, 0, 'Rice', '🍳', 35],
      ['Gobi Manchurian', 'Crisp cauliflower in tangy sauce', 140, 1, 'Starters', '🥦', 30], ['Chilli Chicken', 'Dry chilli chicken', 190, 0, 'Starters', '🌶️', 30],
      ['Veg Spring Rolls (4)', 'Crisp rolls, sweet chilli dip', 110, 1, 'Starters', '🥟', 35], ['Hot & Sour Soup', 'Veg hot and sour soup', 90, 1, 'Soups', '🍲', null]] },
    { id: 6, name: 'Chaat Corner', cuisine: 'Street Chaat', emoji: '🥙', color: '#F77F00', pin: '6666', blurb: 'Tangy, crunchy, sweet and spicy.', items: [
      ['Pani Puri (6)', 'Crisp puris, spiced water', 50, 1, 'Chaat', '🥙', 80], ['Sev Puri', 'Puris topped with sev and chutneys', 60, 1, 'Chaat', '🥙', 60],
      ['Bhel Puri', 'Puffed rice, tamarind, onion', 60, 1, 'Chaat', '🍿', 60], ['Dahi Puri', 'Puris with curd and chutneys', 70, 1, 'Chaat', '🥙', 50],
      ['Samosa Chaat', 'Crushed samosa, chole, curd', 80, 1, 'Chaat', '🥟', 40], ['Pav Bhaji', 'Buttery bhaji, two pavs', 120, 1, 'Mains', '🍞', 35],
      ['Vada Pav', 'Mumbai-style potato fritter in pav', 40, 1, 'Mains', '🍔', 60], ['Masala Chai', 'Ginger cardamom chai', 25, 1, 'Drinks', '🍵', null]] },
    { id: 7, name: 'Tandoori Tales', cuisine: 'North Indian Grill', emoji: '🍗', color: '#BC4749', pin: '7777', blurb: 'Clay-oven kebabs, tikkas and breads.', items: [
      ['Chicken Tikka', 'Charred chicken tikka, mint chutney', 220, 0, 'Grill', '🍗', 35], ['Paneer Tikka', 'Smoky marinated paneer', 200, 1, 'Grill', '🧀', 30],
      ['Seekh Kebab', 'Minced lamb kebabs (4)', 260, 0, 'Grill', '🍢', 25], ['Butter Chicken', 'Creamy tomato gravy', 260, 0, 'Curries', '🍛', 30],
      ['Dal Makhani', 'Slow-cooked black lentils', 180, 1, 'Curries', '🍲', 30], ['Butter Naan', 'Soft tandoor naan', 40, 1, 'Breads', '🫓', 80],
      ['Tandoori Roti', 'Whole wheat tandoor roti', 25, 1, 'Breads', '🫓', 80], ['Mix Grill Platter', 'Tikka, kebab, paneer, naan', 420, 0, 'Combos', '🍽️', 15]] },
    { id: 8, name: 'Sweet Tooth', cuisine: 'Desserts', emoji: '🍰', color: '#FF5D8F', pin: '8888', blurb: 'Cakes, ice creams and hot jalebis.', items: [
      ['Chocolate Truffle Slice', 'Rich truffle cake slice', 110, 1, 'Cakes', '🍰', 25], ['Red Velvet Slice', 'Cream cheese frosting', 120, 1, 'Cakes', '🍰', 20],
      ['Hot Jalebi (100g)', 'Crisp, syrupy and warm', 60, 1, 'Indian', '🍥', 40], ['Rasmalai (2)', 'Saffron milk, soft paneer discs', 90, 1, 'Indian', '🥛', 30],
      ['Vanilla Scoop', 'Two scoops with sauce', 70, 1, 'Ice cream', '🍦', 50], ['Hot Fudge Sundae', 'Ice cream, hot fudge, nuts', 130, 1, 'Ice cream', '🍨', 25],
      ['Waffle with Nutella', 'Crisp waffle, Nutella, banana', 150, 1, 'Waffles', '🧇', 25], ['Kulfi Falooda', 'Kulfi, falooda, rose syrup', 110, 1, 'Indian', '🍧', 25]] },
    { id: 9, name: 'Juice Junction', cuisine: 'Juices & Shakes', emoji: '🥤', color: '#80B918', pin: '9999', blurb: 'Fresh-pressed juices, no added sugar.', items: [
      ['Watermelon Juice', 'Fresh, chilled', 70, 1, 'Juices', '🍉', 40], ['Orange Juice', 'Freshly squeezed', 80, 1, 'Juices', '🍊', 40],
      ['Sugarcane Juice', 'With ginger and lime', 50, 1, 'Juices', '🎋', 60], ['Mango Shake', 'Thick, ripe mango', 100, 1, 'Shakes', '🥭', 30],
      ['Banana Date Shake', 'No sugar, naturally sweet', 100, 1, 'Shakes', '🍌', 25], ['Mosambi Juice', 'Sweet lime, fresh', 70, 1, 'Juices', '🍋', 40],
      ['Mint Mojito', 'Lime, mint and soda', 80, 1, 'Coolers', '🍹', 40], ['Tender Coconut', 'Straight from the shell', 60, 1, 'Coolers', '🥥', 30]] },
    { id: 10, name: 'Roll Republic', cuisine: 'Kathi Rolls', emoji: '🌯', color: '#6A4C93', pin: '1010', blurb: 'Flaky paratha wraps with bold fillings.', items: [
      ['Paneer Tikka Roll', 'Paneer, onion, mint mayo', 110, 1, 'Rolls', '🌯', 40], ['Chicken Kathi Roll', 'Egg-wrapped chicken tikka', 140, 0, 'Rolls', '🌯', 40],
      ['Egg Roll', 'Double egg, onion, chilli', 90, 0, 'Rolls', '🥚', 40], ['Mutton Seekh Roll', 'Seekh kebab in paratha', 170, 0, 'Rolls', '🌯', 25],
      ['Veg Kathi Roll', 'Potato, veg, chutney', 90, 1, 'Rolls', '🌯', 40], ['Chicken Shawarma', 'Garlic sauce, pickles', 130, 0, 'Wraps', '🥙', 30],
      ['Peri Peri Wedges', 'Spicy potato wedges', 80, 1, 'Sides', '🥔', 40], ['Rose Lassi', 'Chilled sweet lassi', 60, 1, 'Drinks', '🥛', 30]] },
    { id: 11, name: 'Filter Kaapi & Co', cuisine: 'Coffee & Snacks', emoji: '☕', color: '#8D5524', pin: '1212', blurb: 'Coffee, tea and light bites all day.', items: [
      ['Filter Kaapi', 'Frothy decoction coffee', 35, 1, 'Hot', '☕', null], ['Cappuccino', 'Espresso and steamed milk', 90, 1, 'Hot', '☕', null],
      ['Masala Chai', 'Ginger and cardamom', 25, 1, 'Hot', '🍵', null], ['Iced Latte', 'Cold espresso with milk', 110, 1, 'Cold', '🧋', 30],
      ['Veg Puff', 'Flaky puff pastry, spiced filling', 35, 1, 'Bites', '🥐', 50], ['Egg Puff', 'Flaky puff with masala egg', 40, 0, 'Bites', '🥐', 40],
      ['Bun Maska', 'Soft bun with butter', 40, 1, 'Bites', '🍞', 40], ['Banana Chips Pack', 'Kerala-style, crisp', 45, 1, 'Bites', '🍌', 50]] },
    { id: 12, name: 'Momo Mania', cuisine: 'Momos & Soups', emoji: '🥟', color: '#3A86FF', pin: '1313', blurb: 'Steamed, fried or tandoori. Always hot.', items: [
      ['Veg Steamed Momos (6)', 'Juicy veg filling, spicy dip', 90, 1, 'Momos', '🥟', 50], ['Chicken Steamed Momos (6)', 'Minced chicken, ginger', 110, 0, 'Momos', '🥟', 50],
      ['Chicken Fried Momos (6)', 'Crisp fried, schezwan dip', 130, 0, 'Momos', '🥟', 40], ['Paneer Tandoori Momos (6)', 'Smoky tandoori glaze', 140, 1, 'Momos', '🥟', 30],
      ['Cheese Corn Momos (6)', 'Melted cheese and corn', 120, 1, 'Momos', '🧀', 30], ['Thukpa', 'Noodle soup with vegetables', 130, 1, 'Soups', '🍜', 25],
      ['Chicken Clear Soup', 'Light, peppery broth', 90, 0, 'Soups', '🍲', 30], ['Momo Combo', '12 mixed momos and a drink', 220, 0, 'Combos', '🍱', 20]] },
  ];
  var OFFERS = [
    { code: '', title: '10% off when you spend ₹500 or more', kind: 'percent', value: 10, min_order: 500, max_discount: 150, shop_id: null, auto: 1, active: 1, ends: null },
    { code: 'WELCOME50', title: '₹50 off your first meal, orders above ₹250', kind: 'flat', value: 50, min_order: 250, max_discount: 0, shop_id: null, auto: 0, active: 1, ends: null },
    { code: 'DOSA20', title: '20% off at Dosa Junction', kind: 'percent', value: 20, min_order: 100, max_discount: 80, shop_id: 1, auto: 0, active: 1, ends: null },
    { code: 'MOMOMANIA', title: 'Flat ₹40 off at Momo Mania, above ₹200', kind: 'flat', value: 40, min_order: 200, max_discount: 0, shop_id: 12, auto: 0, active: 1, ends: null },
  ];
  return { court: { name: 'Spice Lane Food Court', tagline: '12 kitchens. One table.', hours: '11:00 AM to 11:00 PM' }, shops: SHOPS, offers: OFFERS, ownerPassword: 'owner123' };
});
