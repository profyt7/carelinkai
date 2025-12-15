# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to content" [ref=e3] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e4]:
      - main [ref=e5]:
        - generic [ref=e6]:
          - heading "Sign-in error" [level=1] [ref=e7]
          - paragraph [ref=e8]: Invalid email or password
          - link "Back to login" [ref=e9] [cursor=pointer]:
            - /url: /auth/login
    - contentinfo [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: CareLinkAI
        - generic [ref=e13]: v0.1.0 • main@0aeafb1
  - alert [ref=e14]
```