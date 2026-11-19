// Sentences for a round: lowercase letters and single spaces only, 39 to 48
// characters, so every round is the same kind of text.
export const SENTENCES = [
  'the quick brown fox jumps over the lazy dog',
  'a sleepy cat dozed on the warm kitchen floor',
  'seven bright kites danced above the windy hill',
  'my uncle baked a giant pie for the whole town',
  'the jolly baker hid six muffins in a blue box',
  'a curious owl watched the moon from the old oak',
  'the brave little ship sailed past the frozen bay',
  'two quiet foxes shared a picnic by the river',
  'grandma knits warm socks while the kettle sings',
  'a playful puppy chased bubbles across the lawn',
  'the wizard lost his hat in a field of daisies',
  'five noisy frogs sang loudly in the muddy pond',
  'a tiny robot learned to juggle three oranges',
  'the old clock ticked softly in the empty hall',
  'we packed jam sandwiches for the long train ride',
  'a clumsy giraffe tripped over a sleeping zebra',
  'the moon glowed over the quiet snowy village',
  'my best friend found a shiny coin in the sand',
  'the hungry bear sniffed the honey jar with joy',
  'a gentle breeze carried the smell of fresh bread',
  'the pirate buried his map under a palm tree',
  'six ducks waddled proudly down the busy street',
  'the painter dipped her brush in bright yellow',
  'a lazy turtle napped on a warm flat rock',
  'the dragon sneezed and lit the birthday candles',
  'a busy squirrel hid acorns in the garden shed',
  'the children built a fort out of old blankets',
  'a lonely whale sang a song to the deep blue sea',
  'the chef dropped a pancake on the dog by mistake',
  'a fluffy cloud looked just like a sleeping cat',
  'the king lost his crown while dancing at dawn',
  'my sister taught the parrot to whistle a tune',
  'the rocket zoomed past the stars and the moon',
  'a mouse tiptoed across the piano at midnight',
  'the farmer counted his sheep and fell asleep',
  'we watched the fireworks from the cozy rooftop',
  'a goat ate the hat of the mayor at the fair',
  'the snowman wore a scarf and a big smile',
  'the little boat bobbed gently on the waves',
  'a fox in a fancy vest juggled five plums',
  'the robot made toast and burned it again',
  'the kids jumped in puddles after the storm',
  'a wise old frog gave advice to the young toad',
  'the queen ordered extra jam for her biscuits',
  'the zookeeper waved at the sleepy lions',
  'my dog thinks the vacuum is a scary monster',
  'a hot air balloon drifted over the green valley',
  'the baker juggled six eggs and dropped one',
  'the knight polished his shield before the quest',
  'a quick lizard zipped under the warm porch',
  'the lighthouse blinked through the thick fog',
  'we found a frog wearing a tiny golden crown',
  'the band played jazz until the sun came up',
  'a squirrel stole my sandwich and ran away',
  'the bus driver hummed a cheerful little tune',
  'the cat knocked the vase off the shelf again',
  'a polar bear slid down the icy hill for fun',
  'the scientist mixed blue and yellow paint',
  'an excited puppy wagged its tail at the mail',
  'the moon whispered secrets to the sleepy sea',
]

// n different sentences in random order (a partial Fisher-Yates shuffle).
export function pickSentences(n: number, rand = Math.random): string[] {
  const pool = [...SENTENCES]
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}
