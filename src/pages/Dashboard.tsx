import {
  useEffect,
  useState
} from "react";

import GenerationSlider
from "../components/GenerationSlider";

import FamilyNode
from "../components/FamilyNode";

import ProfileCard
from "../components/ProfileCard";

import BottomNav
from "../components/BottomNav";

interface Personne {

  id: string;

  nomComplet: string;

  nationalite?: string;

  region?: string;

  ethnie?: string;

}

interface TreeData {

  me: Personne;

  parents: Personne[];

  grandParents: Personne[];

  siblings: Personne[];

  children: Personne[];

  grandChildren: Personne[];

}

export default function Dashboard() {

  const [
    tree,
    setTree
  ] =
    useState<TreeData | null>(
      null
    );

  const [
    generation,
    setGeneration
  ] =
    useState(0);

  const [
    selectedPerson,
    setSelectedPerson
  ] =
    useState<Personne | null>(
      null
    );

  const [
    loading,
    setLoading
  ] =
    useState(true);

  useEffect(() => {

    const user =
      JSON.parse(
        localStorage.getItem(
          "user"
        ) || "{}"
      );

    if (!user.id) {

      setLoading(false);

      return;

    }

    fetch(
      `http://localhost:5000/api/tree/${user.id}`
    )

    .then(
      res => res.json()
    )

    .then(
      (data) => {

        setTree(data);

        setSelectedPerson(
          data.me
        );

      }
    )

    .catch(
      console.error
    )

    .finally(
      () =>
        setLoading(
          false
        )
    );

  }, []);

  if (
    loading
  ) {

    return (

      <div

        className="
        min-h-screen

        flex

        items-center

        justify-center

        bg-[#F8F6EE]
        "

      >

        Chargement...

      </div>

    );

  }

  if (!tree) {

    return (

      <div

        className="
        min-h-screen

        flex

        items-center

        justify-center
        "

      >

        Impossible de charger
        l'arbre familial.

      </div>

    );

  }

  const getTitle =
    () => {

      switch (
        generation
      ) {

        case 2:
          return "GRANDS-PARENTS";

        case 1:
          return "PARENTS";

        case 0:
          return "TOI & FRATRIE";

        case -1:
          return "ENFANTS";

        case -2:
          return "PETITS-ENFANTS";

        default:
          return "";

      }

    };

  const getData =
    () => {

      switch (
        generation
      ) {

        case 2:
          return tree.grandParents;

        case 1:
          return tree.parents;

        case 0:
          return [
            tree.me,
            ...(tree.siblings || [])
          ];

        case -1:
          return tree.children;

        case -2:
          return tree.grandChildren;

        default:
          return [];

      }

    };

    const familyName =

  tree?.me?.nomComplet

    ?.split(" ")

    ?.slice(-1)[0]

    ?.toUpperCase()

  || "";

  return (

  <div
  className="
  min-h-screen

  bg-gradient-to-b
  from-[#F7F4EA]
  to-[#F8F6EE]

  pb-32

  flex

  justify-center
  "
>

  <div

    className="
    w-[92%]

    max-w-md

    py-6
    "

    >

      {/* HEADER */}

      <div
        className="
        text-center
        "
      >

        <p

          className="
          text-xs

          tracking-[5px]

          uppercase

          text-gray-500
          "

        >

          MON ARBRE

        </p>

        <h1

  className="
  text-5xl

  font-black

  mt-2

  bg-gradient-to-r
  from-[#14532D]
  to-[#C89A2B]

  bg-clip-text

  text-transparent
  "

>

  Famille {familyName}

</h1>


      </div>

      {/* SLIDER */}

      <div
        className="mt-6"
      >

        <GenerationSlider

          generation={
            generation
          }

          onChange={
            setGeneration
          }

        />

      </div>

      {/* ARBRE */}

      <div

        className="
        mt-6

        w-full

        bg-gradient-to-br
        from-[#FBF8EF]
        to-[#F4ECDA]

        rounded-[40px]

        p-8

        shadow-xl

        border

        border-[#E6DCC0]
        "

      >

        <h2

          className="
          text-center

          text-xs

          tracking-widest

          font-semibold

          mb-8

          text-gray-600
          "

        >

          {
            getTitle()
          }

        </h2>

        <div

          className="
          flex

          justify-center

          items-center

          gap-8

          flex-wrap

          w-full
          "

        >

          {

            getData().map(

              (person) => (

              <FamilyNode

                key={
                  person.id
                }

                id={
                  person.id
                }

                nomComplet={
                  person.nomComplet
                }

                selected={

                  selectedPerson
                    ?.id ===
                  person.id

                }

                isCurrentUser={

                  tree.me.id ===
                  person.id

                }

                onClick={() =>

                  setSelectedPerson(
                    person
                  )

                }

              />

              )

            )

          }

        </div>

      </div>

      {/* PROFIL */}

      <div
        className="mt-6"
      >

        <ProfileCard

          person={
            selectedPerson
          }

        />

      </div>

    </div>

      {/* FOOTER */}

      <BottomNav />

    </div>

  );

}