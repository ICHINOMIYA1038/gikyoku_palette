type PlayBodyProps = {
  body: string;
};

export function PlayBody({ body }: PlayBodyProps) {
  return (
    <div className="rounded-lg border bg-white p-6 sm:p-8">
      <pre className="whitespace-pre-wrap break-words font-serif text-base leading-[1.8]">
        {body}
      </pre>
    </div>
  );
}
