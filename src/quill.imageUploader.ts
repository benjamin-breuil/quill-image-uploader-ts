import LoadingImage from "./blots/image";

interface ImageUploaderOptions {
    upload: (file: File) => Promise<string>;
}

interface DeltaOperation {
    insert?: any;
    [key: string]: any;
}

class ImageUploader {
    private quill: any;
    private options: ImageUploaderOptions;
    private range: any;
    private placeholderDelta: any;
    private fileHolder: HTMLInputElement | undefined;

    constructor(quill: any, options: ImageUploaderOptions) {
        this.quill = quill;
        this.options = options;
        this.range = null;
        this.placeholderDelta = null;

        if (typeof this.options.upload !== "function") {
            console.warn("[Missing config] upload function that returns a promise is required");
        }

        const toolbar = this.quill.getModule("toolbar");
        if (toolbar) {
            toolbar.addHandler("image", this.selectLocalImage.bind(this));
        }

        this.handleDrop = this.handleDrop.bind(this);
        this.handlePaste = this.handlePaste.bind(this);

        this.quill.root.addEventListener("drop", this.handleDrop, false);
        this.quill.root.addEventListener("paste", this.handlePaste, false);
    }

    selectLocalImage() {
        this.quill.focus();
        this.range = this.quill.getSelection();
        this.fileHolder = document.createElement("input");
        this.fileHolder.setAttribute("type", "file");
        this.fileHolder.setAttribute("accept", "image/*");
        this.fileHolder.setAttribute("style", "visibility:hidden");

        this.fileHolder.onchange = () => this.fileChanged();

        document.body.appendChild(this.fileHolder);
        this.fileHolder.click();

        window.requestAnimationFrame(() => {
            if (this.fileHolder) {
                document.body.removeChild(this.fileHolder);
            }
        });
    }

    handleDrop(evt: DragEvent) {
        if (evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length) {
            evt.stopPropagation();
            evt.preventDefault();
            if (document.caretRangeFromPoint) {
                const selection = document.getSelection();
                const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
                if (selection && range) {
                    selection.setBaseAndExtent(
                        range.startContainer,
                        range.startOffset,
                        range.startContainer,
                        range.startOffset
                    );
                }
            } else {
                const selection = document.getSelection();
                const range = document.caretPositionFromPoint(evt.clientX, evt.clientY);
                if (selection && range) {
                    selection.setBaseAndExtent(
                        range.offsetNode,
                        range.offset,
                        range.offsetNode,
                        range.offset
                    );
                }
            }

            this.quill.focus();
            this.range = this.quill.getSelection();
            const file = evt.dataTransfer.files[0];

            setTimeout(() => {
                this.quill.focus();
                this.range = this.quill.getSelection();
                this.readAndUploadFile(file);
            }, 0);
        }
    }

    handlePaste(evt: ClipboardEvent) {
        const clipboard = evt.clipboardData || (window as any).clipboardData;

        if (clipboard && (clipboard.items || clipboard.files)) {
            const items = clipboard.items || clipboard.files;
            const IMAGE_MIME_REGEX = /^image\/(jpe?g|gif|png|svg|webp)$/i;

            for (let i = 0; i < items.length; i++) {
                if (IMAGE_MIME_REGEX.test(items[i].type)) {
                    const file = items[i].getAsFile ? items[i].getAsFile() : items[i];

                    if (file) {
                        this.quill.focus();
                        this.range = this.quill.getSelection();
                        evt.preventDefault();
                        setTimeout(() => {
                            this.quill.focus();
                            this.range = this.quill.getSelection();
                            this.readAndUploadFile(file);
                        }, 0);
                    }
                }
            }
        }
    }

    readAndUploadFile(file: File) {
        let isUploadReject = false;

        const fileReader = new FileReader();

        fileReader.addEventListener(
            "load",
            () => {
                if (!isUploadReject) {
                    const base64ImageSrc = fileReader.result as string;
                    this.insertBase64Image(base64ImageSrc);
                }
            },
            false
        );

        if (file) {
            fileReader.readAsDataURL(file);
        }

        this.options.upload(file).then(
            (imageUrl: string) => {
                this.insertToEditor(imageUrl);
            },
            (error: any) => {
                isUploadReject = true;
                this.removeBase64Image();
                console.warn(error);
            }
        );
    }

    fileChanged() {
        if (this.fileHolder) {
            const file = this.fileHolder.files ? this.fileHolder.files[0] : undefined;
            if (file) {
                this.readAndUploadFile(file);
            }
        }
    }

    insertBase64Image(url: string) {
        const range = this.range;

        this.placeholderDelta = this.quill.insertEmbed(
            range.index,
            LoadingImage.blotName,
            url,
            "user"
        );
    }

    insertToEditor(url: string) {
        const range = this.range;

        const lengthToDelete = this.calculatePlaceholderInsertLength();

        this.quill.deleteText(range.index, lengthToDelete, "user");
        this.quill.insertEmbed(range.index, "image", url, "user");

        range.index++;
        this.quill.setSelection(range, "user");
    }

    calculatePlaceholderInsertLength(): number {
        return this.placeholderDelta.ops.reduce((accumulator: number, deltaOperation: DeltaOperation) => {
            if (deltaOperation.hasOwnProperty('insert')) {
                accumulator++;
            }

            return accumulator;
        }, 0);
    }

    removeBase64Image() {
        const range = this.range;
        const lengthToDelete = this.calculatePlaceholderInsertLength();

        this.quill.deleteText(range.index, lengthToDelete, "user");
    }
}

(window as any).ImageUploader = ImageUploader;
export default ImageUploader;
