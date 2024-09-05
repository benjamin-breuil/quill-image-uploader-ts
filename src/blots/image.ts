import Quill from "quill";

const InlineBlot = Quill.import("blots/block");

interface ImageBlotData {
    src: string;
    custom?: string;
}

class LoadingImage extends InlineBlot {
    static create(src: string | boolean): HTMLElement {
        const node = super.create(src);
        if (src === true) return node;

        const image = document.createElement("img");
        image.setAttribute("src", src);
        node.appendChild(image);
        return node;
    }

    deleteAt(index: number, length: number): void {
        super.deleteAt(index, length);
        (this as any).cache = {}; // Assuming `cache` is a property of InlineBlot
    }

    static value(domNode: HTMLElement): ImageBlotData {
        const { src, custom } = domNode.dataset;
        return { src: src ?? '', custom };
    }
}

LoadingImage.blotName = "imageBlot";
LoadingImage.className = "image-uploading";
LoadingImage.tagName = "span";

Quill.register({ "formats/imageBlot": LoadingImage });

export default LoadingImage;
