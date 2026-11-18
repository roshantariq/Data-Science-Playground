export function Explainer() {
  return (
    <>
      <p>
        The curve learns only from the solid training dots. The hollow test dots
        are kept aside, like new data it has never seen, so they show how well
        it really did.
      </p>
      <p>
        The degree is how bendy the curve is allowed to be. Turn it up and the
        curve hugs the training dots more closely, so its error on them keeps
        dropping. On the test dots, the error drops at first while the curve
        picks up the real shape. Then it climbs. The curve has started copying
        the random wobble in the training dots, and that wobble isn't in the
        test ones.
      </p>
      <p>
        This is called <b>overfitting</b>: memorising the examples instead of
        learning the pattern. The curve worth keeping is the one that does well
        on dots it hasn't seen.
      </p>
    </>
  )
}
