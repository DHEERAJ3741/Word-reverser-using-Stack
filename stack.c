__attribute__((export_name("reverse_word")))

void reverse_word(const char *input, char *output) {
    char stack[256];
    int top = -1;
    int i = 0;

    while (input[i] != '\0' && i < 255) {
        stack[++top] = input[i++];
    }

    i = 0;
    while (top >= 0) {
        output[i++] = stack[top--];
    }
    output[i] = '\0';
}
