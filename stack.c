/*
 * Stack Word Reverser
 * Core algorithm written in C and compiled to WebAssembly for the browser.
 */
__attribute__((export_name("reverse_word")))
void reverse_word(const char *input, char *output) {
    char stack[256];
    int top = -1;
    int i = 0;

    /* PUSH: place every character on the stack */
    while (input[i] != '\0' && i < 255) {
        stack[++top] = input[i++];
    }

    /* POP: retrieve characters in reverse order */
    i = 0;
    while (top >= 0) {
        output[i++] = stack[top--];
    }
    output[i] = '\0';
}
