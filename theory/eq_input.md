Unlike Desmos, Grapheme uses plaintext to input equations. Like Desmos, LaTeX is used to render the equation in a palatable format, fit for human consumption.

Grapheme's syntax differs substantially from LaTeX. For example, to write that the function f(x) is defined as 2^(2x) in Grapheme, you can write 2^(2x), (2)^(2x), (2)^2x, or 2^2x. In Latex, these would just make the first character an exponent, and the remaining characters would be at the normal baseline. Indeed, all of these inputs to Grapheme should resolve to 2^{2x} or (2)^{2x} in LaTeX, depending on whether the base of the exponent is surrounded by parentheses. To put explicit parentheses in the exponent, double parentheses should be used:

2^((2x))

If 2^2 * x is meant rather than 2^(2x), this may be explicitly done as (2^2)x or (2^2)(x). Alternatively, and more conveniently, a space may be placed between 2 and x: 2^2 x. Yes, Grapheme's tokenizer recognizes spaces as delimeters.

In general, PEMDAS is followed, except for the case of exponents, as long as there are no operators in the exponent and no spaces. 
