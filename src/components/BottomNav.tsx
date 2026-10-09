import {
  Link,
  useLocation
} from "react-router-dom";

import {
  FaTree,
  FaCompass,
  FaBell,
  FaUser
} from "react-icons/fa";

export default function BottomNav() {

  const location =
    useLocation();

  const isActive = (
    path: string
  ) => {

    return (
      location.pathname ===
      path
    );

  };

  return (

    <div

      className="
      fixed

      bottom-4

      left-1/2

      -translate-x-1/2

      w-[92%]

      max-w-md

      h-20

      bg-white

      rounded-[30px]

      shadow-xl

      flex

      items-center

      justify-around

      border

      border-[#ECE7D5]

      z-50
      "

    >

      <Link

        to="/dashboard"

        className={`

        flex

        flex-col

        items-center

        gap-1

        transition-all

        ${

        isActive(
          "/dashboard"
        )

          ?

        "text-[#14532D]"

          :

        "text-gray-400"

        }

        `}

      >

        <FaTree
          size={20}
        />

        <span
          className="
          text-xs
          "
        >
          Arbre
        </span>

      </Link>

      <Link

        to="/discover"

        className={`

        flex

        flex-col

        items-center

        gap-1

        transition-all

        ${

        isActive(
          "/discover"
        )

          ?

        "text-[#14532D]"

          :

        "text-gray-400"

        }

        `}

      >

        <FaCompass
          size={20}
        />

        <span
          className="
          text-xs
          "
        >
          Découvrir
        </span>

      </Link>

      <Link

        to="/notifications"

        className={`

        flex

        flex-col

        items-center

        gap-1

        relative

        transition-all

        ${

        isActive(
          "/notifications"
        )

          ?

        "text-[#14532D]"

          :

        "text-gray-400"

        }

        `}

      >

        <div
          className="
          relative
          "
        >

          <FaBell
            size={20}
          />

          <span

            className="
            absolute

            -top-2

            -right-2

            w-4

            h-4

            rounded-full

            bg-red-500

            text-white

            text-[9px]

            flex

            items-center

            justify-center
            "

          >

            3

          </span>

        </div>

        <span
          className="
          text-xs
          "
        >
          Notifs
        </span>

      </Link>

      <Link

        to="/profile"

        className={`

        flex

        flex-col

        items-center

        gap-1

        transition-all

        ${

        isActive(
          "/profile"
        )

          ?

        "text-[#14532D]"

          :

        "text-gray-400"

        }

        `}

      >

        <FaUser
          size={20}
        />

        <span
          className="
          text-xs
          "
        >
          Profil
        </span>

      </Link>

    </div>

  );

}