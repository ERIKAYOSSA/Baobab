import {
  FaSeedling,
  FaBookOpen,
  FaMapMarkerAlt,
  FaGlobeAfrica,
  FaUsers
} from "react-icons/fa";

import {
  Link
} from "react-router-dom";

interface Personne {

  id: string;

  nomComplet: string;

  nationalite?: string;

  region?: string;

  ethnie?: string;

}

interface ProfileCardProps {

  person: Personne | null;

}

export default function ProfileCard({

  person

}: ProfileCardProps) {

  if (!person) {

    return null;

  }

  return (

    <div

      className="
      mt-6

      bg-white

      rounded-[32px]

      p-6

      shadow-sm

      border

      border-[#ECE7D5]
      "

    >

      <div

        className="
        flex

        items-center

        gap-4
        "

      >

        <div

          className="
          w-20
          h-20

          rounded-full

          bg-[#14532D]

          text-white

          flex

          items-center

          justify-center

          text-xl

          font-bold
          "

        >

          {

            person.nomComplet

              ?.split(" ")

              .map(
                part =>
                  part[0]
              )

              .join("")

              .substring(0,2)

              .toUpperCase()

          }

        </div>

        <div>

          <h2

            className="
            text-2xl

            font-semibold

            text-gray-900
            "

          >

            {

              person.nomComplet

            }

          </h2>

          <span

            className="
            inline-block

            mt-1

            px-3

            py-1

            rounded-full

            bg-green-100

            text-green-700

            text-xs

            font-semibold
            "

          >

            ✅ Vérifié

          </span>

        </div>

      </div>

      <div

        className="
        mt-5

        space-y-3
        "

      >

        {

          person.region && (

          <div

            className="
            flex

            items-center

            gap-3

            text-gray-600
            "

          >

            <FaMapMarkerAlt />

            <span>

              {
                person.region
              }

            </span>

          </div>

          )

        }

        {

          person.nationalite && (

          <div

            className="
            flex

            items-center

            gap-3

            text-gray-600
            "

          >

            <FaGlobeAfrica />

            <span>

              {
                person.nationalite
              }

            </span>

          </div>

          )

        }

        {

          person.ethnie && (

          <div

            className="
            flex

            items-center

            gap-3

            text-gray-600
            "

          >

            <FaUsers />

            <span>

              {
                person.ethnie
              }

            </span>

          </div>

          )

        }

      </div>

      <div

        className="
        mt-6

        grid

        grid-cols-2

        gap-3
        "

      >

        <Link
          to="/ajouter-proche"
        >

          <button

            className="
            w-full

            h-14

            rounded-2xl

            border

            border-[#14532D]

            text-[#14532D]

            font-medium

            flex

            items-center

            justify-center

            gap-2

            hover:bg-[#14532D]

            hover:text-white

            transition-all
            "

          >

            <FaSeedling />

            Enrichir

          </button>

        </Link>

        <button

          className="
          h-14

          rounded-2xl

          bg-[#14532D]

          text-white

          font-medium

          flex

          items-center

          justify-center

          gap-2

          hover:bg-[#0E3B1F]

          transition-all
          "

        >

          <FaBookOpen />

          Héritage

        </button>

      </div>

    </div>

  );

}