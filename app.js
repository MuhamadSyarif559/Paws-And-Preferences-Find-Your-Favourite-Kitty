// Adjust these to change how many cards load and how far a swipe must travel.
const TOTAL_CATS = 20;
const SWIPE_THRESHOLD = 110;

const stack = document.getElementById("stack");
const loader = document.getElementById("loader");
const progress = document.getElementById("progress");
const hint = document.getElementById("hint");
const likeButton = document.getElementById("like");
const dislikeButton = document.getElementById("dislike");
const summary = document.getElementById("summary");
const likedCount = document.getElementById("liked-count");
const likedGrid = document.getElementById("liked-grid");
const resetButton = document.getElementById("reset");
const burstLayer = document.getElementById("burst-layer");
const page = document.body;

// App state.
let cats = [];
let currentIndex = 0;
let likedCats = [];
let isAnimating = false;
let dragState = null;
let flashTimeout = null;

// Fetch metadata from Cataas; fallback to direct image URLs if API fails.
const fetchCats = async (count) => {
  try {
    const skip = Math.floor(Math.random() * 50);
    const response = await fetch(
      `https://cataas.com/api/cats?limit=${count}&skip=${skip}`
    );
    const data = await response.json();
    return data.map((cat, index) => {
      const catId = cat._id ?? cat.id;
      const apiUrl = cat.url ? `https://cataas.com${cat.url}` : null;
      return {
        id: catId ?? `fallback-${index}`,
        name: cat.tags?.[0] ? `Mood: ${cat.tags[0]}` : `Cat #${index + 1}`,
        url:
          apiUrl ??
          (catId
            ? `https://cataas.com/cat/${catId}`
            : `https://cataas.com/cat?cache=${Date.now()}-${index}`),
      };
    });
  } catch (error) {
    return Array.from({ length: count }, (_, index) => ({
      id: `fallback-${index}`,
      name: `Cat #${index + 1}`,
      url: `https://cataas.com/cat?width=600&height=800&fit=cover&cache=${Date.now()}-${index}`,
    }));
  }
};

// Build DOM nodes for the stack from the cat list.
const renderStack = (catsToRender) => {
  stack.innerHTML = "";

  for (let i = catsToRender.length - 1; i >= 0; i -= 1) {
    const cat = catsToRender[i];
    const card = document.createElement("article");
    card.className = "card";
    card.style.backgroundImage = `url(${cat.url})`;
    card.dataset.index = i.toString();

    const likeStamp = document.createElement("span");
    likeStamp.className = "stamp like";
    likeStamp.textContent = "Like";

    const dislikeStamp = document.createElement("span");
    dislikeStamp.className = "stamp dislike";
    dislikeStamp.textContent = "Nope";

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = cat.name;

    card.append(likeStamp, dislikeStamp, caption);
    stack.appendChild(card);
  }

  setStackPositions();
};

// Apply depth/scale to the stacked cards.
const setStackPositions = () => {
  const cards = Array.from(stack.querySelectorAll(".card"));
  cards.forEach((card, position) => {
    const offset = Math.min(position, 3);
    card.style.transform = `translateY(${offset * 10}px) scale(${1 - offset * 0.02})`;
    card.style.zIndex = String(cards.length - position);
    card.style.opacity = position > 6 ? "0" : "1";
  });
};

// Update progress text above the stack.
const updateProgress = () => {
  progress.textContent = `${currentIndex} / ${cats.length}`;
};

// The last card in the container is visually on top.
const getTopCard = () => stack.querySelector(".card:first-child");

// Snap a card back if the swipe wasn't strong enough.
const resetCard = (card) => {
  card.classList.remove("dragging", "show-like", "show-dislike");
  card.style.transform = "";
};

// Animate a card off-screen and record likes.
const swipeCard = (direction) => {
  const card = getTopCard();
  if (!card || isAnimating) return;

  isAnimating = true;
  triggerBackgroundFlash(direction);
  spawnSwipeEffect(direction, card);
  const moveOut = direction === "right" ? 800 : -800;
  const rotate = direction === "right" ? 18 : -18;
  card.style.transform = `translate(${moveOut}px, -40px) rotate(${rotate}deg)`;
  card.style.opacity = "0";

  const index = Number(card.dataset.index);
  if (direction === "right") {
    likedCats.push(cats[index]);
  }

  setTimeout(() => {
    card.remove();
    currentIndex += 1;
    updateProgress();
    setStackPositions();
    isAnimating = false;
    if (currentIndex >= cats.length) {
      showSummary();
    }
  }, 220);
};

// Briefly flash the background to match the swipe direction.
const triggerBackgroundFlash = (direction) => {
  page.classList.remove("flash-like", "flash-dislike");
  if (flashTimeout) {
    clearTimeout(flashTimeout);
  }
  void page.offsetWidth;
  page.classList.add(direction === "right" ? "flash-like" : "flash-dislike");
  flashTimeout = setTimeout(() => {
    page.classList.remove("flash-like", "flash-dislike");
    flashTimeout = null;
  }, 520);
};

const spawnSwipeEffect = (direction, card) => {
  if (!burstLayer) return;
  const rect = card.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const count = 5;
  const src =
    direction === "right"
      ? "Asset/happy-cat.gif"
      : "Asset/Cute Cat Crying GIF - Cute Cat Crying Tears - Discover & Share GIFs.gif";

  for (let i = 0; i < count; i += 1) {
    const img = document.createElement("img");
    img.className = "swipe-burst";
    img.src = src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");

    const scatterX = (Math.random() - 0.5) * 80;
    const scatterY = (Math.random() - 0.5) * 60;
    const driftBase = direction === "right" ? 140 : -140;
    const driftX = driftBase + (Math.random() - 0.5) * 70;
    const driftY = -80 + (Math.random() - 0.5) * 70;
    const spin = `${(Math.random() * 30 - 15).toFixed(1)}deg`;

    img.style.setProperty("--x", `${centerX + scatterX}px`);
    img.style.setProperty("--y", `${centerY + scatterY}px`);
    img.style.setProperty("--drift-x", `${driftX}px`);
    img.style.setProperty("--drift-y", `${driftY}px`);
    img.style.setProperty("--spin", spin);

    img.addEventListener("animationend", () => {
      img.remove();
    });

    burstLayer.appendChild(img);
  }
};

// Reveal the liked summary once the stack is exhausted.
const showSummary = () => {
  stack.classList.add("hidden");
  hint.textContent = "Done";
  likeButton.disabled = true;
  dislikeButton.disabled = true;
  summary.classList.remove("hidden");
  likedCount.textContent = likedCats.length.toString();

  if (likedCats.length === 0) {
    likedGrid.innerHTML = "<p>No favorites this time. Try again?</p>";
    return;
  }

  likedGrid.innerHTML = "";
  likedCats.forEach((cat) => {
    const img = document.createElement("img");
    img.src = cat.url;
    img.alt = cat.name;
    likedGrid.appendChild(img);
  });
};

const resetApp = () => {
  if (flashTimeout) {
    clearTimeout(flashTimeout);
    flashTimeout = null;
  }
  page.classList.remove("flash-like", "flash-dislike");
  isAnimating = false;
  dragState = null;
  currentIndex = 0;
  likedCats = [];
  stack.classList.remove("hidden");
  summary.classList.add("hidden");
  likedGrid.innerHTML = "";
  hint.textContent = "Drag to swipe";
  initialize();
};

// Pointer gesture start.
const handlePointerDown = (event) => {
  const card = getTopCard();
  if (!card || isAnimating) return;

  card.setPointerCapture(event.pointerId);
  dragState = {
    startX: event.clientX,
    startY: event.clientY,
    card,
  };
  card.classList.add("dragging");
};

// Pointer gesture drag.
const handlePointerMove = (event) => {
  if (!dragState) return;

  const { startX, startY, card } = dragState;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
  const rotation = deltaX / 18;
  card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

  if (deltaX > 40) {
    card.classList.add("show-like");
    card.classList.remove("show-dislike");
  } else if (deltaX < -40) {
    card.classList.add("show-dislike");
    card.classList.remove("show-like");
  } else {
    card.classList.remove("show-like", "show-dislike");
  }
};

// Pointer gesture end; decide swipe vs reset.
const handlePointerUp = (event) => {
  if (!dragState) return;

  const { startX, card } = dragState;
  const deltaX = event.clientX - startX;
  dragState = null;
  card.releasePointerCapture(event.pointerId);

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    swipeCard(deltaX > 0 ? "right" : "left");
  } else {
    resetCard(card);
  }
};

// Entry point: load cats and render the UI.
const initialize = async () => {
  likeButton.disabled = true;
  dislikeButton.disabled = true;
  loader.classList.remove("hidden");
  cats = await fetchCats(TOTAL_CATS);
  loader.classList.add("hidden");
  renderStack(cats);
  updateProgress();
  likeButton.disabled = false;
  dislikeButton.disabled = false;
};

stack.addEventListener("pointerdown", handlePointerDown);
stack.addEventListener("pointermove", handlePointerMove);
stack.addEventListener("pointerup", handlePointerUp);
stack.addEventListener("pointercancel", handlePointerUp);

likeButton.addEventListener("click", () => swipeCard("right"));
dislikeButton.addEventListener("click", () => swipeCard("left"));
resetButton.addEventListener("click", resetApp);

initialize();
