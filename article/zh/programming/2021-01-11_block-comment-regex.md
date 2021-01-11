# One line regex representing block comment

```
  < "/*" (~["*")* ("*")+ (~["/", "*"] (~["*"])* ("*")+)* "/" >
```

This is a headache to understand this snipet even though it's self-explanatory. Instead, using state transition and MORE directive is a much better way achiving this.
