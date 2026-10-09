interface MatchCardProps {

  person: {

    id: string;

    nomComplet: string;

    ville?: string;

    relationProbable?: string;

  };

}

function initials(
  nom: string
) {

  return nom
    .split(" ")
    .map(
      n => n[0]
    )
    .join("")
    .substring(0,2)
    .toUpperCase();

}

export default function MatchCard({

  person

}: MatchCardProps) {

  return (

    <div

      className="
      bg-white

      rounded-[25px]

      p-4

      shadow-sm

      border

      border-[#EFE9D8]
      "

    >

      <div
        className="
        flex
        gap-3
        "
      >

        <div

          className="
          w-14
          h-14

          rounded-full

          bg-[#F6F2E8]

          flex

          items-center

          justify-center

          font-bold

          text-lg
          "

        >

          {
            initials(
              person.nomComplet
            )
          }

        </div>

        <div>

          <h3
            className="
            font-semibold
            "
          >

            {
              person.nomComplet
            }

          </h3>

          <p
            className="
            text-sm
            text-gray-500
            "
          >

            📍 {
              person.ville ||
              "Inconnue"
            }

          </p>

        </div>

      </div>

      <p

        className="
        text-sm

        text-gray-600

        mt-4
        "

      >

        {

          person
            .relationProbable ||

          "Lien potentiel détecté"

        }

      </p>

      <div

        className="
        flex

        gap-2

        mt-4
        "

      >

        <button

          className="
          flex-1

          bg-[#14532D]

          text-white

          h-10

          rounded-full
          "

        >

          Voir

        </button>

        <button

          className="
          flex-1

          border

          border-gray-300

          h-10

          rounded-full
          "

        >

          Ignorer

        </button>

      </div>

    </div>

  );

}
