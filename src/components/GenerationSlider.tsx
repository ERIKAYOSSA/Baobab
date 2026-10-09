interface GenerationSliderProps {

  generation: number;

  onChange: (
    value: number
  ) => void;

}

export default function GenerationSlider({

  generation,

  onChange

}: GenerationSliderProps) {

  const labels = [

    {
      value: 2,
      label: "N+2"
    },

    {
      value: 1,
      label: "N+1"
    },

    {
      value: 0,
      label: "Moi"
    },

    {
      value: -1,
      label: "N-1"
    },

    {
      value: -2,
      label: "N-2"
    }

  ];

  return (

    <div
      className="
      bg-white
      rounded-[28px]
      p-5
      shadow-sm
      "
    >

      <div
        className="
        flex
        justify-between
        text-xs
        text-gray-500
        mb-3
        "
      >

        <span>
          Descendance
        </span>

        <span>
          Ascendants
        </span>

      </div>

      <input
        type="range"
        min="-2"
        max="2"
        step="1"
        value={generation}
        onChange={(e) =>

          onChange(
            Number(
              e.target.value
            )
          )

        }

        className="
        w-full

        accent-[#14532D]
        cursor-pointer
        "
      />

      <div
        className="
        mt-4

        flex

        justify-between

        items-center
        "
      >

        {

          labels.map(

            (item) => (

            <button

              key={
                item.value
              }

              type="button"

              onClick={() =>
                onChange(
                  item.value
                )
              }

              className={`

              px-3

              py-1.5

              rounded-full

              text-xs

              transition-all

              ${

              generation ===
              item.value

                ?

              "bg-[#14532D] text-white shadow-md"

                :

              "bg-[#F2F0E4] text-gray-600"

              }

              `}

            >

              {

              item.label

              }

            </button>

            )

          )

        }

      </div>

      <div
        className="
        mt-4

        text-center
        "
      >

        <span
          className="
          text-xs

          uppercase

          tracking-widest

          text-gray-500
          "
        >

          génération sélectionnée

        </span>

      </div>

    </div>

  );

}