export default function delay(delay) {
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
};