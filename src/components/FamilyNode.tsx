interface FamilyNodeProps {

  id: string;

  nomComplet: string;

  selected?: boolean;

  isCurrentUser?: boolean;

  onClick?: () => void;

}

function getInitials(
  nom: string
) {

  return nom
    ?.split(" ")
    .map(
      word => word[0]
    )
    .join("")
    .substring(0, 2)
    .toUpperCase();

}

export default function FamilyNode({

  nomComplet,

  selected = false,

  isCurrentUser = false,

  onClick

}: FamilyNodeProps) {

  return (

    <button

      type="button"

      onClick={onClick}

      className="
      flex
      flex-col
      items-center
      transition-all
      duration-300
      hover:scale-105
      "

    >

      <div

        className={`

        w-24
        h-24

        rounded-full

        border-[5px]

        flex

        items-center

        justify-center

        font-bold

        text-base

        shadow-xl

        transition-all

        duration-300

        ${

        isCurrentUser

        ? "bg-[#14532D] text-white border-[#2E7D32]"

        : selected

        ? "bg-[#14532D] text-white border-[#2E7D32]"

        : "bg-white text-[#14532D] border-[#2E7D32]"

        }

        `}

      >

        {

          getInitials(
            nomComplet
          )

        }

      </div>

      <span

        className={`

        mt-3

        text-xs

        font-medium

        text-center

        max-w-[90px]

        truncate

        ${

        selected

        ? "text-[#14532D]"

        : "text-gray-600"

        }

        `}

      >

        {

          nomComplet

        }

      </span>

      {

        isCurrentUser && (

        <span

          className="
          mt-1

          px-2

          py-1

          rounded-full

          bg-green-100

          text-green-800

          text-[10px]

          font-semibold
          "

        >

          Moi

        </span>

        )

      }

    </button>

  );

}